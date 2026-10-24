import { notFound } from "next/navigation";

import { requireAuth } from "@/app/lib/auth/auth";
import { getProfileForDashboard } from "@/app/businessLogic/profileBusinessLogic";
import {
  getProductForDashboard,
  getSellerStatusForUser,
} from "@/app/businessLogic/productBusinessLogic";

import ProductEditor from "../ProductEditor";

import "../../dashboard.css";
import "../products.css";

export default async function EditProductPage({ params }) {
  const { id } = await params;

  const user = await requireAuth();

  const [profile, sellerInfo] = await Promise.all([
    getProfileForDashboard(user.id, user.username),
    getSellerStatusForUser(user.id),
  ]);

  let product;

  try {
    product = await getProductForDashboard(user.id, id);
  } catch (error) {
    notFound();
  }

  return (
    <main className="dash-content">
      <ProductEditor
        mode="edit"
        productId={id}
        initialProduct={product}
        sellerUsername={profile.username}
        sellerInfo={sellerInfo}
      />
    </main>
  );
}