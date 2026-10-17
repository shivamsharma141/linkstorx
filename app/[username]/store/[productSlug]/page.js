import { notFound } from "next/navigation";

import { getCurrentUser } from "@/app/lib/auth/auth";
import { getPublicProfile } from "@/app/businessLogic/profileBusinessLogic";
import { getPublicProduct } from "@/app/businessLogic/productBusinessLogic";

import PublicProductView from "./PublicProductView";

import "../../public-profile.css";
import "../store.css";
import "./product.css";

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
  const { username, productSlug } = await params;

  try {
    const viewerUserId = await getViewerUserId();

    // Draft product ka metadata bahar leak nahi hona chahiye
    await getPublicProfile(username, viewerUserId);

    const product = await getPublicProduct(username, productSlug);

    const title = `${product.name} | ${username} Store`;

    return {
      title,
      description: product.shortDescription || product.name,
      openGraph: {
        title,
        images: product.images?.length ? [product.images[0]] : [],
      },
    };
  } catch {
    return { title: "Product | LinkStorx" };
  }
}

export default async function PublicProductPage({ params }) {
  const { username, productSlug } = await params;

  const viewerUserId = await getViewerUserId();

  try {
    // Page publish nahi hai => product bhi live nahi (owner ko preview milega)
    await getPublicProfile(username, viewerUserId);
  } catch (error) {
    notFound();
  }

  let product;

  try {
    product = await getPublicProduct(username, productSlug);
  } catch (error) {
    notFound();
  }

  return <PublicProductView product={product} username={username} />;
}