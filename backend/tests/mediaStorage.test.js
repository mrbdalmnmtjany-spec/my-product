const test = require('node:test');
const assert = require('node:assert/strict');
const { uploadMedia, getMediaUrl, deleteMedia } = require('../utils/mediaStorage');

const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_BUCKET'];
const values = ['https://project.supabase.co', 'test-service-role-key', 'moaaz-social-media'];

function setupEnv(t) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key, i) => { process.env[key] = values[i]; });
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
    keys.forEach((key) => previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]);
  });
}

test('uploads to Supabase Storage and returns an object key, not a permanent public URL', async (t) => {
  setupEnv(t);
  let request;
  global.fetch = async (url, options) => { request = { url, options }; return { ok: true, status: 200 }; };
  const result = await uploadMedia(Buffer.from('test'), { folder: 'avatars', mimetype: 'image/jpeg', originalname: 'avatar.jpg' });
  assert.match(request.url, /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/moaaz-social-media\/avatars\//);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.apikey, 'test-service-role-key');
  assert.ok(result.key.startsWith('avatars/'));
  assert.equal(result.secure_url, undefined);
});

test('creates an expiring signed URL from a private object key', async (t) => {
  setupEnv(t);
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ signedURL: '/object/sign/moaaz-social-media/posts/item.jpg?token=abc' }) };
  };
  const url = await getMediaUrl('posts/item.jpg', 900);
  assert.equal(request.options.method, 'POST');
  assert.equal(JSON.parse(request.options.body).expiresIn, 900);
  assert.equal(url, 'https://project.supabase.co/storage/v1/object/sign/moaaz-social-media/posts/item.jpg?token=abc');
});

test('deletes a storage object by key', async (t) => {
  setupEnv(t);
  let request;
  global.fetch = async (url, options) => { request = { url, options }; return { ok: true, status: 200 }; };
  await deleteMedia('posts/item.jpg');
  assert.equal(request.options.method, 'DELETE');
  assert.deepEqual(JSON.parse(request.options.body), { prefixes: ['posts/item.jpg'] });
});

test('rejects uploads when Supabase Storage is not configured', async (t) => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  t.after(() => keys.forEach((key) => previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key]));
  await assert.rejects(() => uploadMedia(Buffer.from('x')), { status: 503 });
});
