import { connectToDatabase } from "@/app/lib/database/mongodb";
import Inquiry from "@/app/databaseModels/Inquiry";

export async function createInquiry(data) {
  await connectToDatabase();

  return Inquiry.create(data);
}

/* Is IP ke `since` ke baad ke latest `limit` inquiries (newest first) */
export async function findRecentInquiriesByIp(ipHash, since, limit) {
  await connectToDatabase();

  return Inquiry.find({ ipHash, createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("createdAt")
    .lean();
}