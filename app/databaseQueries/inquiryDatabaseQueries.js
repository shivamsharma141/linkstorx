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

/* =========================================================
   INBOX (seller)
========================================================= */

/* 30 din se purani inquiry kahin nahi dikhti / count hoti (model ke TTL index se match) */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const cutoffDate = () => new Date(Date.now() - RETENTION_MS);

/* Backup cleanup: TTL index na chale to bhi 30 din purani inquiries yahan se delete ho jaati hain */
export async function deleteExpiredInquiries(sellerId) {
  await connectToDatabase();

  return Inquiry.deleteMany({ sellerId, createdAt: { $lt: cutoffDate() } });
}

/* Inbox list: newest first. ipHash kabhi bahar nahi jaata. */
export async function findInquiriesBySeller(sellerId, limit = 300) {
  await connectToDatabase();

  return Inquiry.find({ sellerId, createdAt: { $gte: cutoffDate() } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name contact contactType offering message status createdAt")
    .lean();
}

/* Nav badge: index (sellerId + status) se fast count */
export async function countUnreadInquiries(sellerId) {
  await connectToDatabase();

  return Inquiry.countDocuments({
    sellerId,
    status: "unread",
    createdAt: { $gte: cutoffDate() },
  });
}

/* sellerId filter: koi dusre seller ka message touch nahi kar sakta */
export async function updateInquiryStatus(sellerId, id, status) {
  await connectToDatabase();

  return Inquiry.findOneAndUpdate({ _id: id, sellerId }, { status }, { new: true })
    .select("_id")
    .lean();
}

export async function deleteInquiryById(sellerId, id) {
  await connectToDatabase();

  return Inquiry.deleteOne({ _id: id, sellerId });
}