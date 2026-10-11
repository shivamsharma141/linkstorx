import mongoose from "mongoose";

const pendingSignupSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  // TTL index: 15 min baad MongoDB khud delete kar deta hai
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.models.PendingSignup ||
  mongoose.model("PendingSignup", pendingSignupSchema);