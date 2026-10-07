import { requireAuth } from "@/app/lib/auth/auth";
import { getProductsForDashboard } from "@/app/businessLogic/productBusinessLogic";
import { getProfileForDashboard } from "@/app/businessLogic/profileBusinessLogic";

import ProductsList from "./ProductsList";

import "../dashboard.css";
import "./products.css";

export default async function DashboardProductsPage() {
  const user = await requireAuth();

  const [products, profile] = await Promise.all([
    getProductsForDashboard(user.id, {}),
    getProfileForDashboard(user.id, user.username),
  ]);

  return (
    <main className="dash-content">
      <ProductsList
        initialProducts={products}
        sellerUsername={profile.username}
      />
    </main>
  );
}