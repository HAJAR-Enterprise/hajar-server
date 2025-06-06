const crypto = require("crypto");
require("dotenv").config();

const algorithm = "aes-256-ctr";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
};

const decrypt = (text) => {
  const [iv, encrypted] = text.split(":");
  if (!iv || !encrypted) {
    throw new Error("Invalid encrypted text format");
  }
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

module.exports = { encrypt, decrypt };
