import { uploadImageController } from "@/app/controllers/uploadController";

export async function POST(request) {
  return uploadImageController(request);
}
