import { notFound } from "next/navigation";

import { getCurrentUser } from "@/app/lib/auth/auth";
import { getPublicProfile } from "@/app/businessLogic/profileBusinessLogic";
import { getPublicStore } from "@/app/businessLogic/productBusinessLogic";

import PublicStoreView from "./PublicStoreView";

import "../public-profile.css";
import "./store.css";

export const dynamic = "force-dynamic";

async function getViewerUserId() {
  try {
    const user = await getCurrentUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { username } = await params;

  try {
    const viewerUserId = await getViewerUserId();

    // Draft store ka metadata bahar leak nahi hona chahiye
    await getPublicProfile(username, viewerUserId);

    const { seller } = await getPublicStore(username);

    const title = `${seller.displayName || seller.username}'s Store | LinkStorx`;

    return {
      title,
      description:
        seller.bio || `Shop products from ${seller.displayName || seller.username} on LinkStorx.`,
      openGraph: {
        title,
        images: seller.profileImage ? [seller.profileImage] : [],
      },
    };
  } catch {
    return { title: "Store | LinkStorx" };
  }
}

export default async function PublicStorePage({ params }) {
  const { username } = await params;

  const viewerUserId = await getViewerUserId();

  try {
    // Page publish nahi hai => store bhi live nahi (owner ko preview milega)
    await getPublicProfile(username, viewerUserId);
  } catch (error) {
    notFound();
  }

  let store;

  try {
    store = await getPublicStore(username);
  } catch (error) {
    notFound();
  }

  return <PublicStoreView store={store} />;
}