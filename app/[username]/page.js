import { notFound } from "next/navigation";

import { getPublicProfile } from "@/app/businessLogic/profileBusinessLogic";
import { getPublicStore } from "@/app/businessLogic/productBusinessLogic";

import PublicProfileView from "./PublicProfileView";

import "./public-profile.css";

export default async function PublicProfilePage({ params }) {
  const { username } = await params;

  let profile;

  try {
    profile = await getPublicProfile(username);
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