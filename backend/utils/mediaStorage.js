const crypto = require('crypto');
const path = require('path');

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_BUCKET'];
const isConfigured = () => required.every((key) => Boolean(process.env[key]));
const baseUrl = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const headers = () => ({
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
});

const safeSegment = (value) => String(value || 'media').replace(/[^a-z0-9_-]/gi, '-').slice(0, 40);
const encodeKey = (key) => key.split('/').map(encodeURIComponent).join('/');

function assertConfigured() {
  if (!isConfigured()) {
    const error = new Error('تخزين الوسائط غير مفعّل. أضف إعدادات Supabase Storage إلى متغيرات بيئة الخادم.');
    error.status = 503;
    throw error;
  }
}

async function uploadMedia(buffer, { folder = 'uploads', mimetype = 'application/octet-stream', originalname = 'file' } = {}) {
  assertConfigured();
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new TypeError('Media buffer is required');
  const ext = path.extname(originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  const key = `${safeSegment(folder)}/${Date.now()}-${crypto.randomBytes(16).toString('hex')}${ext}`;
  const response = await fetch(`${baseUrl()}/storage/v1/object/${encodeURIComponent(process.env.SUPABASE_BUCKET)}/${encodeKey(key)}`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': mimetype, 'x-upsert': 'false' },
    body: buffer,
  });
  if (!response.ok) {
    const error = new Error(`تعذر رفع الوسائط إلى Supabase Storage (HTTP ${response.status}).`);
    error.status = 502;
    throw error;
  }
  return { key, public_id: key };
}

async function getMediaUrl(key, expiresIn = 3600) {
  if (!key) return '';
  assertConfigured();
  const response = await fetch(`${baseUrl()}/storage/v1/object/sign/${encodeURIComponent(process.env.SUPABASE_BUCKET)}/${encodeKey(key)}`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) {
    const error = new Error(`تعذر إنشاء رابط مؤقت للوسائط (HTTP ${response.status}).`);
    error.status = 502;
    throw error;
  }
  const data = await response.json();
  const signed = data.signedURL || data.signedUrl;
  if (!signed) throw new Error('Supabase did not return a signed URL');
  return signed.startsWith('http') ? signed : `${baseUrl()}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`;
}

async function deleteMedia(key) {
  if (!key) return;
  assertConfigured();
  const response = await fetch(`${baseUrl()}/storage/v1/object/${encodeURIComponent(process.env.SUPABASE_BUCKET)}`, {
    method: 'DELETE',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [key] }),
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Supabase Storage delete failed (HTTP ${response.status})`);
  }
}

module.exports = { uploadMedia, getMediaUrl, deleteMedia, isConfigured };
