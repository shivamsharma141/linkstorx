import { notFound } from "next/navigation";

import { getPublicProduct } from "@/app/businessLogic/productBusinessLogic";

import PublicProductView from "./PublicProductView";

import "../../public-profile.css";
import "../store.css";
import "./product.css";

export async function generateMetadata({ params }) {
  const { username, productSlug } = await params;

  try {
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

  let product;

  try {
    product = await getPublicProduct(username, productSlug);
  } catch (error) {
    notFound();
  }

  return <PublicProductView product={product} username={username} />;
}
