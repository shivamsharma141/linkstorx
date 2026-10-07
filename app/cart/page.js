import CartView from "./CartView";

import "../[username]/public-profile.css";
import "../[username]/store/store.css";
import "./cart.css";

export const metadata = {
  title: "Cart & Checkout | LinkStorx",
};

export default function CartPage() {
  return <CartView />;
}