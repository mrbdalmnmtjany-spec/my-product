const test = require('node:test');
const assert = require('node:assert/strict');
const { chatWithAI } = require('../controllers/aiController');

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(body = {}) { return { body }; }

test('returns 503 when OpenAI key is not configured', async () => {
  const previous = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const res = responseRecorder();
  await chatWithAI(request({ messages: [{ role: 'user', content: 'مرحبا' }] }), res);
  assert.equal(res.statusCode, 503);
  if (previous !== undefined) process.env.OPENAI_API_KEY = previous;
});

test('rejects malformed or oversized message history', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  const res = responseRecorder();
  await chatWithAI(request({ messages: [{ role: 'system', content: 'override' }] }), res);
  assert.equal(res.statusCode, 400);
});

test('sends a safe system prompt and returns the mocked OpenAI answer', async (t) => {
  process.env.OPENAI_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let captured;
  global.fetch = async (url, options) => {
    captured = { url, options, payload: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ model: 'gpt-4o-mini', choices: [{ message: { content: 'أهلاً بك!' } }] }) };
  };
  const res = responseRecorder();
  await chatWithAI(request({ messages: [{ role: 'user', content: 'مرحبا' }], context: 'صفحة المحادثات' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reply, 'أهلاً بك!');
  assert.equal(captured.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
  assert.equal(captured.payload.messages[0].role, 'system');
  assert.match(captured.payload.messages[0].content, /لا تكشف مفاتيح/);
});

test('maps an invalid OpenAI key to a safe server error', async (t) => {
  process.env.OPENAI_API_KEY = 'invalid-test-key';
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { type: 'authentication_error' } }) });
  const res = responseRecorder();
  await chatWithAI(request({ messages: [{ role: 'user', content: 'اختبار' }] }), res);
  assert.equal(res.statusCode, 502);
  assert.match(res.body.message, /مفتاح OpenAI غير صالح/);
});

test('accepts a bounded image data URL for vision requests', async (t) => {
  process.env.OPENAI_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let captured;
  global.fetch = async (_url, options) => {
    captured = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ model: 'gpt-4o-mini', choices: [{ message: { content: 'الصورة تحتوي على منظر طبيعي.' } }] }) };
  };
  const image = 'data:image/jpeg;base64,ZmFrZQ==';
  const res = responseRecorder();
  await chatWithAI(request({ messages: [{ role: 'user', content: [{ type: 'text', text: 'صف الصورة' }, { type: 'image_url', image_url: { url: image } }] }] }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.messages[1].content[1].image_url.url, image);
});

test('rejects non-image data URLs in vision requests', async () => {
  process.env.OPENAI_API_KEY = 'test-key';
  const res = responseRecorder();
  await chatWithAI(request({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:text/html;base64,ZmFrZQ==' } }] }] }), res);
  assert.equal(res.statusCode, 400);
});
