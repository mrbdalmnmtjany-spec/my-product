const test = require('node:test');
const assert = require('node:assert/strict');
const { uploadMedia, deleteMedia } = require('../utils/mediaStorage');

const keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];

test('uploads a media buffer to the configured R2 endpoint with SigV4 auth', async (t) => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key, i) => { process.env[key] = ['account', 'access-key', 'secret-key', 'bucket', 'https://media.example.test'][i]; });
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; keys.forEach((key) => previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]); });
  let request;
  global.fetch = async (url, options) => { request = { url, options }; return { ok: true, status: 200 }; };
  const result = await uploadMedia(Buffer.from('test'), { folder: 'avatars', mimetype: 'image/jpeg', originalname: 'avatar.jpg' });
  assert.match(request.url, /^https:\/\/account\.r2\.cloudflarestorage\.com\/bucket\/avatars\//);
  assert.match(request.options.headers.Authorization, /^AWS4-HMAC-SHA256 /);
  assert.equal(request.options.method, 'PUT');
  assert.match(result.secure_url, /^https:\/\/media\.example\.test\/avatars\//);
  assert.ok(result.key);
});

test('rejects uploads when R2 is not configured', async (t) => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  t.after(() => keys.forEach((key) => previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]));
  await assert.rejects(() => uploadMedia(Buffer.from('x')), { status: 503 });
});
