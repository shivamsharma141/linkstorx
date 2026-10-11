import { requireAdmin } from "@/app/lib/auth/auth";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  const admin = await requireAdmin();

  return (
    <div style={{ padding: 40 }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {admin.username}</p>
    </div>
  );
}