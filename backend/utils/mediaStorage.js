const crypto = require('crypto');
const path = require('path');

const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
const isConfigured = () => required.every((key) => Boolean(process.env[key]));
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value).digest(encoding);
const awsEncode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

function signedHeaders(method, key, body, contentType = '') {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${awsEncode(process.env.R2_BUCKET_NAME)}/${key.split('/').map(awsEncode).join('/')}`;
  const payloadHash = sha256(body || Buffer.alloc(0));
  const headers = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  if (contentType) headers['content-type'] = contentType;
  const signedNames = Object.keys(headers).sort();
  const canonicalHeaders = signedNames.map((name) => `${name}:${String(headers[name]).trim()}\n`).join('');
  const signedHeadersValue = signedNames.join(';');
  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeadersValue, payloadHash].join('\n');
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${process.env.R2_SECRET_ACCESS_KEY}`, dateStamp);
  const kRegion = hmac(kDate, 'auto');
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');
  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${signedHeadersValue}, Signature=${signature}`;
  return { url: `https://${host}${canonicalUri}`, headers };
}

const safeSegment = (value) => String(value || 'media').replace(/[^a-z0-9_-]/gi, '-').slice(0, 40);

async function uploadMedia(buffer, { folder = 'uploads', mimetype = 'application/octet-stream', originalname = 'file' } = {}) {
  if (!isConfigured()) {
    const error = new Error('تخزين الوسائط غير مفعّل. أضف إعدادات Cloudflare R2 إلى متغيرات بيئة الخادم.');
    error.status = 503;
    throw error;
  }
  const ext = path.extname(originalname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  const key = `${safeSegment(folder)}/${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`;
  const { url, headers } = signedHeaders('PUT', key, buffer, mimetype);
  delete headers.host; // fetch supplies the matching Host header from the URL
  const response = await fetch(url, { method: 'PUT', headers, body: buffer });
  if (!response.ok) {
    const error = new Error(`تعذر رفع الوسائط إلى R2 (HTTP ${response.status}).`);
    error.status = 502;
    throw error;
  }
  return { secure_url: `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`, public_id: key, key };
}

async function deleteMedia(key) {
  if (!key || !isConfigured()) return;
  const { url, headers } = signedHeaders('DELETE', key, Buffer.alloc(0));
  delete headers.host;
  const response = await fetch(url, { method: 'DELETE', headers });
  if (!response.ok && response.status !== 404) throw new Error(`R2 delete failed (${response.status})`);
}

module.exports = { uploadMedia, deleteMedia, isConfigured };
