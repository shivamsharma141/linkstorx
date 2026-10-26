import { requireAdmin } from "@/app/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function Nav2Page() {
  await requireAdmin();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>nav2</h1>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Coming soon.</p>
    </div>
  );
}