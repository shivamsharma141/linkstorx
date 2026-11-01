import { createInquiryController } from "@/app/controllers/inquiryController";

export async function POST(request) {
  return createInquiryController(request);
}