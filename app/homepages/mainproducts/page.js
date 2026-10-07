import Navbar from "@/app/component/navbar/navbar";
import { getCurrentUser } from "@/app/lib/auth/auth";
import MarketplaceClient from "./Marketplaceclient";

// Server component: navbar yahan render hota hai (home page jaisa)
export default async function MarketplacePage() {
  const user = await getCurrentUser();
  const navUser = user ? { username: user.username, email: user.email } : null;

  return (
    <>
      <Navbar user={navUser} />
      <MarketplaceClient />
    </>
  );
}