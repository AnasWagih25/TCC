"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import OptimizedImage from "@/components/OptimizedImage";
export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const [error, setError] = useState("");
  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const changeQuantity = (index: number, change: number) => {
    const result = updateQuantity(index, change);
    setError(result.success ? "" : result.message);
  };
  return (
    <div className="page active" id="cartPage">
      <section className="cart-page section-wrap">
        <div className="section-header">
          <h1 className="section-title">Your bag of joy.</h1>
          <p className="section-subtitle">
            {cart.length
              ? "A few very good choices. Let’s make them yours."
              : "Something delicious belongs here."}
          </p>
        </div>
        {!cart.length ? (
          <div className="cart-empty">
            <ShoppingBag
              size={45}
              strokeWidth={1.2}
              style={{ margin: "0 auto 25px" }}
            />
            <h3>Good things are worth adding.</h3>
            <p>Find your favorite concept and we’ll keep it here for you.</p>
            <Link href="/shop" className="button-chocolate">
              Explore the menu{" "}
              <span>
                <ArrowUpRight size={20} />
              </span>
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div>
              <div className="cart-items">
                {cart.map((item, index) => (
                  <article className="cart-item" key={`${item.id}-${index}`}>
                    <div className="cart-photo">
                      <OptimizedImage
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="100px"
                      />
                    </div>
                    <div className="cart-item-details">
                      <h2 className="cart-item-name">{item.name}</h2>
                      <p className="cart-variant">
                        {item.boxSize
                          ? `Box of ${item.boxSize}`
                          : item.selectedFlavor || item.selectedSize}
                      </p>
                      {item.boxFlavors?.map((flavor) => (
                        <p className="cart-extra" key={flavor.name}>
                          {flavor.name} × {flavor.quantity}
                        </p>
                      ))}
                      {item.selectedCustomizations?.map((extra) => (
                        <p className="cart-extra" key={extra.name}>
                          + {extra.name}
                          {extra.text ? `: ${extra.text}` : ""}
                        </p>
                      ))}
                      <div className="cart-item-price">
                        EGP {item.price.toFixed(2)} each
                      </div>
                      <div className="quantity-controls">
                        <button
                          className="qty-btn"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() => changeQuantity(index, -1)}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="qty-value" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          className="qty-btn"
                          aria-label={`Increase ${item.name} quantity`}
                          onClick={() => changeQuantity(index, 1)}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="cart-line-end">
                      <strong>
                        EGP {(item.price * item.quantity).toFixed(2)}
                      </strong>
                      <button
                        className="cart-item-remove"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeFromCart(index)}
                      >
                        <Trash2 size={17} strokeWidth={1.4} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Link
                href="/shop"
                className="text-link"
                style={{ marginTop: 22 }}
              >
                A little more cookie browsing <ArrowUpRight size={17} />
              </Link>
            </div>
            <aside className="cart-summary">
              <h3>The happy total.</h3>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>EGP {subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="cart-delivery-note">
                <p>
                  Next-day delivery: EGP 70–100, depending on your location.
                </p>
                <p>Or pick up in Second New Cairo, at no delivery charge.</p>
              </div>
              <div className="summary-row total">
                <span>Subtotal</span>
                <span>EGP {subtotal.toFixed(2)}</span>
              </div>
              <Link href="/checkout" className="button-chocolate cart-checkout">
                Continue to checkout{" "}
                <span>
                  <ArrowUpRight size={20} />
                </span>
              </Link>
              <p className="cart-payment-note">
                Cash on delivery / pickup, Instapay or Telda.
              </p>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
