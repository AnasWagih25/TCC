const copy = value => structuredClone(value);
class Database {
  constructor(seed = {}) { this.data = new Map(Object.entries(seed).map(([key, value]) => [key, copy(value)])); this.serial = Promise.resolve(); this.failCommit = false; }
  snapshot(key) { const value = this.data.get(key); return { id: key.split('/').pop(), exists: value !== undefined, data: () => value === undefined ? undefined : copy(value) }; }
  collection(name) {
    const db = this;
    const query = { name, constraints: [], doc: id => ({ key: `${name}/${id}`, id }), where(field, op, value) { return { ...this, constraints: [...this.constraints, [field, op, value]] }; }, orderBy(field) { return { ...this, sort: field }; }, limit(max) { return { ...this, max }; }, async get() { let docs = [...db.data.keys()].filter(key => key.startsWith(`${name}/`)).map(key => db.snapshot(key)); for (const [field, op, value] of this.constraints) docs = docs.filter(doc => op === '<=' ? typeof doc.data()[field] === 'number' && doc.data()[field] <= value : op === 'in' ? value.includes(doc.data()[field]) : doc.data()[field] === value); if (this.sort) docs.sort((a, b) => a.data()[this.sort] - b.data()[this.sort]); return { docs: docs.slice(0, this.max || Infinity) }; } };
    return query;
  }
  writer() {
    const changes = []; const db = this;
    return { create(ref, data) { changes.push(['create', ref, data]); }, update(ref, data) { changes.push(['update', ref, data]); }, set(ref, data, options) { changes.push([options?.merge ? 'merge' : 'set', ref, data]); }, async commit() { if (db.failCommit) throw new Error('Database unavailable'); for (const [type, ref] of changes) { if (type === 'create' && db.data.has(ref.key)) throw new Error('Already exists'); if (type === 'update' && !db.data.has(ref.key)) throw new Error('Missing document'); } for (const [type, ref, data] of changes) db.data.set(ref.key, copy(type === 'update' || type === 'merge' ? { ...db.data.get(ref.key), ...data } : data)); } };
  }
  batch() { return this.writer(); }
  runTransaction(operation) {
    const execute = async () => { const writes = this.writer(); const transaction = { ...writes, get: ref => ref.key ? Promise.resolve(this.snapshot(ref.key)) : ref.get(), getAll: (...refs) => Promise.all(refs.map(ref => this.snapshot(ref.key))) }; const result = await operation(transaction); await writes.commit(); return result; };
    const result = this.serial.then(execute); this.serial = result.catch(() => {}); return result;
  }
}
module.exports = { Database };
