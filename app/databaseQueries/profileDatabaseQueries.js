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

/*
 * NOTE: payload mein isPublished / publishedAt kabhi nahi bheja jata,
 * isliye normal save publish state ko touch nahi karta.
 */
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

/*
 * Sirf publish. Unpublish system nahi hai.
 * (Purani calls jaise setProfilePublished(userId, true) bhi chalti rahengi,
 * extra argument ignore hota hai.)
 */
export async function setProfilePublished(userId) {
  await connectToDatabase();

  return Profile.findOneAndUpdate(
    { userId },
    {
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      new: true,
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