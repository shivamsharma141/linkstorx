import { requireAdmin } from "@/app/lib/auth/auth";
import AdminSidebar from "./AdminSidebar";

import "./adminShell.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();

  return (
    <div className="ash-shell">
      <AdminSidebar username={admin.username} />
      <main className="ash-main">{children}</main>
    </div>
  );
}