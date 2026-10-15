"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Cookie, Copy, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import OptimizedImage from "./OptimizedImage";

export default function HeroShowcase() {
  const { heroImage, products, categories, heroRotationEnabled } = useCart();
  const [selected, setSelected] = useState<string | null>(null);
  const [treat, setTreat] = useState(false);
  const [copied, setCopied] = useState(false);
  const cakes = products
    .filter(
      (product) =>
        !categories.find((category) => category.id === product.type)
          ?.isBoxBuilder && product.price.mini > 0,
    )
    .slice(0, 3);
  const current = cakes.find((product) => product.id === selected);
  const image = current?.image || heroImage;
  return (
    <section className="cake-hero" aria-labelledby="cake-hero-title">
      <div className="cake-hero-copy">
        <h1 id="cake-hero-title">
          A good idea.<span>A great cookie.</span>
        </h1>
        <p>Thick cookies. Melty middles. A little happiness in every box.</p>
        <div className="cake-hero-actions">
          <Link href="/shop" className="button-chocolate">
            Explore the menu
            <span>
              <ArrowUpRight size={20} />
            </span>
          </Link>
          <Link href="/about" className="hero-story-link">
            Our story
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="cake-stage-shell">
        <div
          className={`cake-stage ${heroRotationEnabled ? "cake-stage-animated" : ""}`}
        >
          <div className="cake-stage-note">
            <Cookie size={27} strokeWidth={1.3} />
            <p>
              Made to share.
              <br />
              <span>Or keep to yourself.</span>
            </p>
          </div>
          <div className="cake-image-window" key={current?.id || "studio"}>
            <OptimizedImage
              src={image}
              alt={
                current
                  ? `${current.name}, shown whole`
                  : "The Cookie Concept cookie cake, shown whole"
              }
              objectFit="contain"
              fill
              priority
              sizes="(max-width: 760px) 90vw, 600px"
              fallbackSrc="/images/preview.png"
            />
          </div>
          <div className="cake-stage-aside">
            <span>
              A soft spot
              <br />
              for chocolate.
            </span>
            <button
              className="treat-button"
              aria-expanded={treat}
              aria-controls="cookie-treat"
              onClick={() => setTreat(!treat)}
            >
              A little treat <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="cake-stage-toolbar">
          <div className="cake-caption" aria-live="polite">
            <span>{current ? current.name : "Your next cookie moment."}</span>
            <small>
              {current
                ? "Choose your size and make it yours."
                : "Handcrafted, with a generous helping of chocolate."}
            </small>
          </div>
          <div className="cake-selector" aria-label="Preview our cookie cakes">
            <button
              className={`cake-thumbnail ${selected === null ? "selected" : ""}`}
              aria-label="Preview the bakery’s featured cake"
              aria-pressed={selected === null}
              onClick={() => setSelected(null)}
            >
              <OptimizedImage
                src={heroImage}
                alt="Featured cake"
                width={52}
                height={52}
                objectFit="contain"
              />
            </button>
            {cakes.map((cake) => (
              <button
                key={cake.id}
                className={`cake-thumbnail ${selected === cake.id ? "selected" : ""}`}
                aria-label={`Preview ${cake.name}`}
                aria-pressed={selected === cake.id}
                onClick={() => setSelected(cake.id)}
              >
                <OptimizedImage
                  src={cake.image}
                  alt={cake.name}
                  width={52}
                  height={52}
                  objectFit="contain"
                />
              </button>
            ))}
          </div>
          <button
            className="mobile-treat-button"
            aria-expanded={treat}
            aria-controls="cookie-treat"
            onClick={() => setTreat(!treat)}
          >
            A little treat <ArrowUpRight size={15} />
          </button>
          {current && (
            <Link
              href={`/shop?product=${encodeURIComponent(current.id)}`}
              className="cake-order-link"
              aria-label={`Choose ${current.name}`}
            >
              Choose this cake
              <ArrowUpRight size={18} />
            </Link>
          )}
        </div>
      </div>
      {treat && (
        <div id="cookie-treat" className="cookie-treat" role="status">
          <div>
            <strong>A little something for the curious.</strong>
            <p>Use QUIRK at checkout for 5% off your order.</p>
          </div>
          <button
            className="treat-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText("QUIRK");
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? "Copied" : "Copy QUIRK"}
          </button>
          <button
            className="icon-button"
            aria-label="Close treat"
            onClick={() => setTreat(false)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
