import {
  getProfileController,
  updateProfileController,
} from "@/app/controllers/profileController";

export async function GET(request) {
  return getProfileController(request);
}

export async function PUT(request) {
  return updateProfileController(request);
}
