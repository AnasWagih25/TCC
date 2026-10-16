const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loader } = require('./helpers/load-ts.cjs');
function harness(rejected = false) {
  const messages = [];
  const load = loader({ 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) } }, nodemailer: { createTransport: () => ({ sendMail: async mail => { messages.push(mail); return { accepted: rejected ? [] : ['bakery'], rejected: rejected ? ['bakery'] : [] }; } }) } }, { process: { env: { EMAIL_USER: 'sender@example.invalid', EMAIL_PASS: 'test-only' } }, JSON, SyntaxError, console: { error() {}, warn() {} } });
  return { route: load('src/app/api/send-contact-email/route.ts'), messages };
}
const request = body => new Request('https://example.com/api/send-contact-email', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
const valid = { name: 'Test <name>', email: 'test@example.invalid', phone: '', inquiryType: 'General Inquiry', message: 'Hello <script>alert(1)</script> & cookies' };
test('contact requests reject missing, malformed and oversized fields before sending mail', async () => {
  const { route, messages } = harness();
  for (const body of [{}, null, [], { ...valid, email: 'invalid' }, { ...valid, message: '' }, { ...valid, message: 'x'.repeat(5001) }, { ...valid, name: 'Name\nInjected' }]) assert.equal((await route.POST(request(body))).status, 400);
  assert.equal((await route.POST(request('{'))).status, 400);
  assert.equal((await route.POST(request('x'.repeat(32001)))).status, 413);
  assert.equal(messages.length, 0);
});
test('contact messages escape customer HTML, preserve plain text and set a validated reply address', async () => {
  const { route, messages } = harness();
  assert.equal((await route.POST(request(valid))).status, 200);
  assert.equal(messages[0].replyTo, valid.email);
  assert.ok(messages[0].html.includes('&lt;script&gt;'));
  assert.ok(!messages[0].html.includes('<script>'));
  assert.ok(messages[0].text.includes(valid.message));
});
test('rejected contact messages never report success', async () => {
  const { route } = harness(true);
  const response = await route.POST(request(valid));
  assert.equal(response.status, 500); assert.equal((await response.json()).success, false);
});
