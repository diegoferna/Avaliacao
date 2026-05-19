const crypto = require("crypto");
const bcrypt = require("bcrypt");

const BCRYPT_ROUNDS = 12;

function generateApiKey() {
  return crypto.randomBytes(32).toString("base64url");
}

async function hashApiKey(plainKey) {
  return bcrypt.hash(plainKey, BCRYPT_ROUNDS);
}

async function verifyApiKey(plainKey, hash) {
  if (!plainKey || !hash) return false;
  return bcrypt.compare(plainKey, hash);
}

module.exports = {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
};
