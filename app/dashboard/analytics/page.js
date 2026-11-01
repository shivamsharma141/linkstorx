import { requireAuth } from "@/app/lib/auth/auth";
import { getProfileForDashboard } from "@/app/businessLogic/profileBusinessLogic";

import AnalyticsView from "./AnalyticsView";

import "../dashboard.css";
import "./analytics.css";

export default async function AnalyticsPage() {
  const user = await requireAuth();

  const profile = await getProfileForDashboard(user.id, user.username);

  return (
    <main className="dash-content">
      <AnalyticsView
        username={profile.exists ? profile.username : ""}
        displayName={profile.displayName || profile.username || user.username || ""}
        isPublished={Boolean(profile.isPublished)}
      />
    </main>
  );
}
