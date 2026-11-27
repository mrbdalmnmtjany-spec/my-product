const test = require("node:test");
const assert = require("node:assert/strict");
const { presentUser, presentPost, presentMessage } = require("../utils/mediaPresentation");

test("presents a Supabase avatar as a signed URL and never returns its storage key", async (t) => {
  const previous = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_BUCKET: process.env.SUPABASE_BUCKET,
  };
  Object.assign(process.env, {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-secret",
    SUPABASE_BUCKET: "moaaz-social-media",
  });
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ signedURL: "/object/sign/moaaz-social-media/avatars/avatar.jpg?token=abc" }),
  });
  t.after(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const user = await presentUser({ _id: "u1", name: "A", avatar: "", avatarPublicId: "avatars/avatar.jpg" });
  assert.match(user.avatar, /token=abc/);
  assert.equal(Object.hasOwn(user, "avatarPublicId"), false);
});

test("keeps legacy external media URLs while stripping internal keys", async () => {
  const post = await presentPost({
    _id: "p1",
    mediaUrl: "https://legacy.example/image.jpg",
    mediaKey: "legacy-cloudinary-id",
    author: { _id: "u1", name: "A", avatar: "https://google.example/avatar.jpg" },
    comments: [],
  });
  assert.equal(post.mediaUrl, "https://legacy.example/image.jpg");
  assert.equal(Object.hasOwn(post, "mediaKey"), false);
});

test("does not treat an unpopulated ObjectId as a user document", async () => {
  const objectId = { _bsontype: "ObjectId", toString: () => "abc" };
  const message = await presentMessage({ _id: "m1", sender: objectId, mediaUrl: "", mediaKey: "" });
  assert.equal(message.sender, objectId);
});
