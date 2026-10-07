import { notFound } from "next/navigation";

import { getPublicStore } from "@/app/businessLogic/productBusinessLogic";

import PublicStoreView from "./PublicStoreView";

import "../public-profile.css"
import "./store.css";

export async function generateMetadata({ params }) {
  const { username } = await params;

  try {
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

  let store;

  try {
    store = await getPublicStore(username);
  } catch (error) {
    notFound();
  }

  return <PublicStoreView store={store} />;
}
