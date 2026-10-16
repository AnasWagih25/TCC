const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(options = {}) {
  const calls = { queries: [], writes: [], uploads: [], listeners: [] };
  const firestore = {
    collection: (_, name) => name,
    doc: (_, name, id) => `${name}/${id}`,
    query: (...args) => { calls.queries.push(args); return args; },
    where: (...args) => ({ where: args }), limit: value => ({ limit: value }),
    getDocs: async () => ({ docs: (options.documents || []).map(value => ({ id: value.id, data: () => value })) }),
    setDoc: async (...args) => { if (options.writeError) throw new Error('Permission denied'); calls.writes.push(args); },
    onSnapshot: (query, next, error) => { const listener = { query, next, error, closed: false }; calls.listeners.push(listener); return () => { listener.closed = true; }; },
  };
  const storage = {
    ref: (_, path) => path,
    uploadBytesResumable: (path, file) => {
      calls.uploads.push({ path, file });
      const upload = options.uploadError ? Promise.reject(new Error('Upload failed')) : Promise.resolve();
      upload.cancel = () => {};
      return upload;
    },
    getDownloadURL: async path => `https://firebasestorage.googleapis.com/${path}`,
  };
  const source = ts.transpileModule(fs.readFileSync('src/lib/reviews.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => name === 'firebase/firestore' ? firestore : name === 'firebase/storage' ? storage : { db: {}, storage: {} }, crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout, Promise, console });
  return { ...exports, calls };
}
const review = { id: 'f6fc217a-c96a-48d7-a4e2-3f37bb933715', name: 'Test customer', title: 'A real review', body: 'A written review of a cookie order.', product: 'Classic', rating: 5, photos: [], status: 'pending', createdAt: '2026-10-15T15:00:00.000Z', source: 'customer' };

test('review data rejects malformed ratings, dates and image links', () => {
  const api = harness();
  assert.equal(api.isCustomerReview(review), true);
  for (const invalid of [{ rating: 0 }, { rating: 6 }, { rating: 2.5 }, { createdAt: 'invalid' }, { photos: ['javascript:alert(1)'] }, { name: '' }, { title: undefined }]) assert.equal(api.isCustomerReview({ ...review, ...invalid }), false);
});
test('public reads query published reviews and ignore invalid documents', async () => {
  const api = harness({ documents: [{ ...review, status: 'published' }, { ...review, id: 'bad', createdAt: 'invalid' }] });
  const result = await api.loadReviews();
  assert.equal(result.length, 1);
  assert.equal(JSON.stringify(api.calls.queries[0][1]), JSON.stringify({ where: ['status', '==', 'published'] }));
});
test('photo upload completes before review persistence and keeps existing photos', async () => {
  const api = harness();
  await api.saveReview({ ...review, photos: ['https://firebasestorage.googleapis.com/existing.jpg'] }, [{ name: 'order.jpg', type: 'image/jpeg' }]);
  assert.equal(api.calls.uploads.length, 1);
  assert.match(api.calls.uploads[0].path, /^review-photos\/[a-f0-9-]+\/[a-f0-9-]+\.jpg$/);
  assert.equal(api.calls.writes[0][0], `reviews/${review.id}`);
  assert.equal(api.calls.writes[0][1].photos.length, 2);
  assert.equal(api.calls.writes[0][1].status, 'pending');
});
test('failed uploads do not create a partial review', async () => {
  const api = harness({ uploadError: true });
  await assert.rejects(api.saveReview(review, [{ name: 'order.jpg' }]));
  assert.equal(api.calls.writes.length, 0);
});
test('write failures propagate so the UI cannot report false success', async () => {
  const api = harness({ writeError: true });
  await assert.rejects(api.saveReview(review, []), /Permission denied/);
});
test('deadline resolves successful work and rejects stalled work', async () => {
  const api = harness();
  assert.equal(await api.withDeadline(Promise.resolve('saved'), 100), 'saved');
  await assert.rejects(api.withDeadline(new Promise(() => {}), 5), /taking too long/);
});

test('ambiguous writes retain an identical prepared retry without uploading photos again', async () => {
  const first = harness({ writeError: true });
  let prepared;
  await assert.rejects(first.saveReview(review, [{ name: 'order.jpg' }], value => { prepared = value; }));
  assert.equal(prepared.id, review.id);
  assert.equal(prepared.createdAt, review.createdAt);
  assert.equal(prepared.photos.length, 1);
  const retry = harness();
  await retry.saveReview(prepared, []);
  assert.equal(retry.calls.uploads.length, 0);
  assert.equal(JSON.stringify(retry.calls.writes[0][1]), JSON.stringify(prepared));
});

test('review permission failures unlock edits while ambiguous failures retain safe identical retries', () => {
  const api = harness();
  for (const code of ['permission-denied', 'storage/unauthorized', 'unauthenticated']) {
    const failure = api.reviewSaveFailure({ code }, true);
    assert.equal(failure.definitive, true);
    assert.match(failure.message, /permissions/);
  }
  assert.equal(api.reviewSaveFailure(new Error('Network lost'), true).definitive, false);
  assert.match(api.reviewSaveFailure(new Error('Network lost'), true).message, /same submission/);
});

test('review subscriptions receive new submissions, recover after errors and clean up listeners', () => {
  const api = harness(); const batches = [], errors = [];
  const stop = api.subscribeReviews(true, values => batches.push(values), error => errors.push(error));
  const listener = api.calls.listeners[0];
  listener.error(new Error('Temporary connection failure'));
  listener.next({ docs: [{ id: review.id, data: () => review }] });
  listener.next({ docs: [{ id: review.id, data: () => ({ ...review, status: 'hidden' }) }] });
  assert.equal(errors.length, 1); assert.equal(batches.length, 2);
  assert.equal(batches[1][0].status, 'hidden'); stop(); assert.equal(listener.closed, true);
});
