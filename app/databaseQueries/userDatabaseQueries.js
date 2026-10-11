import { connectToDatabase } from "@/app/lib/database/mongodb";
import User from "@/app/databaseModels/User";
import PendingSignup from "@/app/databaseModels/PendingSignup";

export async function findUserByEmail(email) {
  await connectToDatabase();

  return User.findOne({ email });
}

export async function findUserByUsername(username) {
  await connectToDatabase();

  return User.findOne({ username });
}

export async function findUserByIdentifier(identifier) {
  await connectToDatabase();

  return User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select("+passwordHash");
}

export async function createUser(data) {
  await connectToDatabase();

  return User.create(data);
}

export async function findUserById(userId) {
  await connectToDatabase();

  return User.findById(userId);
}

/* ---------------- PENDING SIGNUP (OTP se pehle) ---------------- */

export async function findPendingSignup(email) {
  await connectToDatabase();

  return PendingSignup.findOne({ email });
}

export async function savePendingSignup(data) {
  await connectToDatabase();

  return PendingSignup.findOneAndUpdate({ email: data.email }, data, {
    upsert: true,
    new: true,
  });
}

export async function bumpPendingAttempts(email) {
  await connectToDatabase();

  return PendingSignup.updateOne({ email }, { $inc: { attempts: 1 } });
}

/*
 * Atomic attempt counter.
 * Sirf tab attempt count badhata hai jab pending abhi expire nahi hua
 * aur attempts limit se kam hain. Parallel requests se limit cross nahi hoti.
 * Updated document return karta hai, ya null (expired / limit khatam).
 */
export async function consumePendingAttempt(email, maxAttempts) {
  await connectToDatabase();

  return PendingSignup.findOneAndUpdate(
    {
      email,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: maxAttempts },
    },
    { $inc: { attempts: 1 } },
    { new: true }
  );
}

/*
 * Resend ke liye atomic update.
 * Sirf tab chalta hai jab last OTP resendCutoff se pehle bheja gaya tha
 * (60 sec cooldown). PURANA document return karta hai (new: false)
 * taaki email fail hone par restore kiya ja sake. Cooldown active ho to null.
 */
export async function reissuePendingCode(email, update, resendCutoff) {
  await connectToDatabase();

  return PendingSignup.findOneAndUpdate(
    { email, lastSentAt: { $lte: resendCutoff } },
    { $set: update },
    { new: false }
  );
}

export async function deletePendingSignup(email) {
  await connectToDatabase();

  return PendingSignup.deleteOne({ email });
}

/* ---------------- PASSWORD RESET ---------------- */

export async function findUserForPasswordReset(email) {
  await connectToDatabase();

  return User.findOne({ email }).select(
    "+resetCodeHash +resetCodeExpiresAt"
  );
}

export async function saveResetCode(
  userId,
  resetCodeHash,
  resetCodeExpiresAt
) {
  await connectToDatabase();

  return User.findByIdAndUpdate(
    userId,
    {
      resetCodeHash,
      resetCodeExpiresAt,
    },
    {
      new: true,
    }
  );
}

export async function clearResetCode(userId) {
  await connectToDatabase();

  return User.findByIdAndUpdate(
    userId,
    {
      $unset: {
        resetCodeHash: 1,
        resetCodeExpiresAt: 1,
      },
    },
    {
      new: true,
    }
  );
}

export async function updatePassword(userId, passwordHash) {
  await connectToDatabase();

  return User.findByIdAndUpdate(
    userId,
    {
      passwordHash,
      $unset: {
        resetCodeHash: 1,
        resetCodeExpiresAt: 1,
      },
    },
    {
      new: true,
    }
  );
}