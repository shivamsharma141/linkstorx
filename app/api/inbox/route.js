import {
  getInboxController,
  updateInboxController,
  deleteInboxController,
} from "@/app/controllers/inquiryController";

/* Ek hi API: GET = list, PATCH = status update, DELETE = message delete */
export const GET = getInboxController;
export const PATCH = updateInboxController;
export const DELETE = deleteInboxController;