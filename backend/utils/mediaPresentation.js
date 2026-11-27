const { getMediaUrl } = require("./mediaStorage");

const toPlain = (value) => {
  if (!value) return value;
  return typeof value.toObject === "function" ? value.toObject() : { ...value };
};

const isSupabaseKey = (key) =>
  typeof key === "string" && /^(avatars|posts|stories|messages(?:-[a-z]+)?)\//.test(key);

async function presentUser(value) {
  if (!value || typeof value !== "object") return value;
  const user = toPlain(value);
  if (user.avatarPublicId && !user.avatar && isSupabaseKey(user.avatarPublicId)) {
    user.avatar = await getMediaUrl(user.avatarPublicId);
  }
  delete user.avatarPublicId;
  delete user.password;
  delete user.verificationToken;
  delete user.resetPasswordToken;
  return user;
}

async function presentPost(value) {
  if (!value) return value;
  const post = toPlain(value);
  if (post.mediaKey && !post.mediaUrl && isSupabaseKey(post.mediaKey)) {
    post.mediaUrl = await getMediaUrl(post.mediaKey);
  }
  delete post.mediaKey;
  if (post.author && typeof post.author === "object") post.author = await presentUser(post.author);
  if (Array.isArray(post.comments)) {
    post.comments = await Promise.all(post.comments.map(async (comment) => {
      const item = { ...comment };
      if (item.user && typeof item.user === "object") item.user = await presentUser(item.user);
      return item;
    }));
  }
  return post;
}

async function presentStory(value) {
  if (!value) return value;
  const story = toPlain(value);
  if (story.mediaKey && !story.mediaUrl && isSupabaseKey(story.mediaKey)) {
    story.mediaUrl = await getMediaUrl(story.mediaKey);
  }
  delete story.mediaKey;
  if (story.user && typeof story.user === "object") story.user = await presentUser(story.user);
  if (Array.isArray(story.viewers)) {
    story.viewers = await Promise.all(story.viewers.map((viewer) =>
      viewer && typeof viewer === "object" ? presentUser(viewer) : viewer
    ));
  }
  return story;
}

async function presentChat(value) {
  if (!value) return value;
  const chat = toPlain(value);
  if (Array.isArray(chat.members)) {
    chat.members = await Promise.all(chat.members.map((member) =>
      member && typeof member === "object" ? presentUser(member) : member
    ));
  }
  if (Array.isArray(chat.groupAdmins)) {
    chat.groupAdmins = await Promise.all(chat.groupAdmins.map((admin) =>
      admin && typeof admin === "object" ? presentUser(admin) : admin
    ));
  }
  if (chat.lastMessage && typeof chat.lastMessage === "object") {
    chat.lastMessage = await presentMessage(chat.lastMessage);
  }
  return chat;
}

async function presentMessage(value, depth = 0) {
  if (!value) return value;
  const message = toPlain(value);
  if (message.mediaKey && !message.mediaUrl && isSupabaseKey(message.mediaKey)) {
    message.mediaUrl = await getMediaUrl(message.mediaKey);
  }
  delete message.mediaKey;
  if (message.sender && typeof message.sender === "object") {
    message.sender = await presentUser(message.sender);
  }
  if (depth < 1 && message.replyTo && typeof message.replyTo === "object") {
    message.replyTo = await presentMessage(message.replyTo, depth + 1);
  }
  return message;
}

module.exports = { isSupabaseKey, presentUser, presentPost, presentStory, presentMessage, presentChat };
