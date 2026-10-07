import { connectToDatabase } from "@/app/lib/database/mongodb";
import User from "@/app/databaseModels/User";

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