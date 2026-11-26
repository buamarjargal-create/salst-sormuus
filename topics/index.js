'use strict';
// Сэдвийн сан: хичээл бүр тусдаа шалгалт. Багш «Тохиргоо → Сэдэв сонгох»-оос ачаална.
const KEYS = ['10.4.2b', '10.4.2g', '10.5a', '10.5b', '10.5g', '10.5d', '11.3b', '11.3v', '11.3d', '11.3e', '11.4a', '11.5a', '11.5b'];
const LIST = KEYS.map(k => require('./' + k));
function list() { return LIST.map(t => ({ key: t.key, grade: t.grade, code: t.code, topic: t.topic, n: t.questions.length })); }
function get(key) { return LIST.find(t => t.key === key) || null; }
module.exports = { list, get };
