import { notFound } from "next/navigation";

import { getCurrentUser } from "@/app/lib/auth/auth";
import { getPublicProfile } from "@/app/businessLogic/profileBusinessLogic";
import { getPublicStore } from "@/app/businessLogic/productBusinessLogic";

import PublicProfileView from "./PublicProfileView";

import "./public-profile.css";

/* Publish ke baad turant effect dikhe, cache na ho */
export const dynamic = "force-dynamic";

async function getViewerUserId() {
  try {
    const user = await getCurrentUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export default async function PublicProfilePage({ params }) {
  const { username } = await params;

  const viewerUserId = await getViewerUserId();

  let profile;

  try {
    // Draft hai toh sirf owner dekh sakta hai, baaki sabko 404
    profile = await getPublicProfile(username, viewerUserId);
  } catch (error) {
    notFound();
  }

  let storeProducts = [];

  try {
    const store = await getPublicStore(username);
    storeProducts = store.products || [];
  } catch (error) {
    // Seller has no store / no products yet — Shop tab will show the empty state.
  }

  return <PublicProfileView profile={profile} storeProducts={storeProducts} />;
}