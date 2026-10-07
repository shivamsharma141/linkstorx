import { checkUsernameController } from "@/app/controllers/profileController";

export async function GET(request) {
  return checkUsernameController(request);
}
