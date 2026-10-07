import { requireAuth } from "@/app/lib/auth/auth";
import { getProfileForDashboard } from "@/app/businessLogic/profileBusinessLogic";

import ProfileEditor from "./ProfileEditor";

import "../dashboard.css";
import "./my-store.css";

export default async function MyStorePage() {
  const user = await requireAuth();

  const profile = await getProfileForDashboard(
    user.id,
    user.username
  );

  return (
    <main className="dash-content">
      <ProfileEditor initialProfile={profile} />
    </main>
  );
}
