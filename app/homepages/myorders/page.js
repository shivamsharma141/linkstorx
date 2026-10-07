import Navbar from "@/app/component/navbar/navbar"; // <-- apna Navbar ka asli path yahan daal
import { getCurrentUser } from "@/app/lib/auth/auth";
import MyOrders from "./MyOrders";

import "./myorders.css";

export const metadata = {
  title: "My Orders | LinkStorx",
};

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  let user = null;
  try {
    const u = await getCurrentUser();
    if (u) {
      user = {
        username: u.username || u.name || "User",
        email: u.email || "",
      };
    }
  } catch {
    user = null;
  }

  return (
    <>
      <Navbar user={user} />
      <MyOrders />
    </>
  );
}