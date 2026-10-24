import { requireAuth } from "@/app/lib/auth/auth";
import { getProfileForDashboard } from "@/app/businessLogic/profileBusinessLogic";
import {
  getSellerStatusForUser,
  registerSellerForUser,
} from "@/app/businessLogic/productBusinessLogic";

import ProductEditor from "../ProductEditor";

import "../../dashboard.css";
import "../products.css";

export default async function NewProductPage() {
  const user = await requireAuth();

  const [profile, sellerInfo] = await Promise.all([
    getProfileForDashboard(user.id, user.username),
    getSellerStatusForUser(user.id),
  ]);

  async function registerSellerAction(data) {
    "use server";

    // Re-authenticate inside the action — never trust the client.
    const current = await requireAuth();

    try {
      await registerSellerForUser(current.id, data);
      return { success: true };
    } catch (error) {
      if (!error.statusCode || error.statusCode === 500) {
        console.error("Seller registration error:", error);
        return { success: false, message: "Something went wrong. Please try again." };
      }
      return { success: false, message: error.message, fields: error.fields };
    }
  }

  return (
    <main className="dash-content">
      <ProductEditor
        mode="create"
        sellerUsername={profile.username}
        sellerInfo={sellerInfo}
        registerSeller={registerSellerAction}
      />
    </main>
  );
}