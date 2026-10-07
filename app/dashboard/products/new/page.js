import { requireAuth } from "@/app/lib/auth/auth";
import { getProfileForDashboard } from "@/app/businessLogic/profileBusinessLogic";

import ProductEditor from "../ProductEditor";

import "../../dashboard.css";
import "../products.css";

export default async function NewProductPage() {
  const user = await requireAuth();

  const profile = await getProfileForDashboard(user.id, user.username);

  return (
    <main className="dash-content">
      <ProductEditor mode="create" sellerUsername={profile.username} />
    </main>
  );
}
