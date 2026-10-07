import { connectToDatabase } from "@/app/lib/database/mongodb";
import Profile from "@/app/databaseModels/Profile";

export async function findProfileByUserId(userId) {
  await connectToDatabase();

  return Profile.findOne({ userId });
}

export async function findProfileByUsername(username) {
  await connectToDatabase();

  return Profile.findOne({ publicUsername: username });
}

export async function createProfile(data) {
  await connectToDatabase();

  return Profile.create(data);
}

export async function updateProfile(userId, updateData) {
  await connectToDatabase();

  return Profile.findOneAndUpdate(
    { userId },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
}

export async function checkUsernameExists(username, excludeUserId) {
  await connectToDatabase();

  const query = { publicUsername: username };

  if (excludeUserId) {
    query.userId = { $ne: excludeUserId };
  }

  const existing = await Profile.exists(query);

  return Boolean(existing);
}
