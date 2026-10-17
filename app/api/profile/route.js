import {
  getProfileController,
  updateProfileController,
  publishProfileController,
} from "@/app/controllers/profileController";

export async function GET(request) {
  return getProfileController(request);
}

export async function PUT(request) {
  return updateProfileController(request);
}

export async function POST(request) {
  return publishProfileController(request);
}