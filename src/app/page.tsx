"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Cookie,
  MapPin,
  Package,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import OptimizedImage from "@/components/OptimizedImage";
import Reviews from "@/components/Reviews";
import HeroShowcase from "@/components/HeroShowcase";
import StorefrontMotion from "@/components/StorefrontMotion";

export default function Home() {
  const { products, categories, pickupSettings } = useCart();
  const featured = products.slice(0, 3);
  return (
    <div className="home-new taste-storefront">
      <StorefrontMotion />
      <HeroShowcase />
      <section className="section-wrap fresh-picks" id="fresh-picks">
        <div className="menu-discovery">
          <div className="menu-discovery-title">
            <h2>
              Your next{" "}
              <span className="heading-image">
                <OptimizedImage
                  src="/images/classic1.png"
                  alt=""
                  fill
                  sizes="100px"
                />
              </span>
              <br />
              <em>happy place.</em>
            </h2>
            <div>
              <p>
                Meet a few of our cookie concepts.
                <br />
                The hardest part? Choosing just one.
              </p>
              <Link className="text-link" href="/shop">
                Explore the menu <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="featured-products">
            {featured.map((product, index) => (
              <Link
                key={product.id}
                href={`/shop?product=${encodeURIComponent(product.id)}`}
                className="feature-product"
              >
                <div className={`feature-product-image flavor-${index}`}>
                  <OptimizedImage
                    src={product.images?.[0] || product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 700px) 90vw, 33vw"
                  />
                  <span className="product-corner">
                    <ArrowUpRight size={21} />
                  </span>
                  {product.stock <= 0 && (
                    <span className="sold-label">Sold out</span>
                  )}
                </div>
                <div className="feature-product-meta">
                  <h3>{product.name}</h3>
                  <span>
                    EGP{" "}
                    {categories.find((category) => category.id === product.type)
                      ?.isBoxBuilder && product.boxPricing?.length
                      ? Math.min(
                          ...product.boxPricing.map((option) => option.price),
                        )
                      : product.price.mini > 0
                        ? product.price.mini
                        : product.price.normal}
                    <small>
                      {categories.find(
                        (category) => category.id === product.type,
                      )?.isBoxBuilder
                        ? " / from"
                        : product.price.mini > 0
                          ? " / mini"
                          : ""}
                    </small>
                  </span>
                </div>
                <p>{product.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="story-preview section-wrap taste-story">
        <div className="story-photo">
          <OptimizedImage
            src="/images/classic1.png"
            alt="Belgian milk chocolate cookie cake, baked by The Cookie Concept"
            fill
            sizes="(max-width: 700px) 100vw, 45vw"
          />
        </div>
        <div className="story-copy">
          <h2>
            A little dough.
            <br />A lot of heart.
          </h2>
          <p>
            It started with weekend baking for friends and family. Today, that
            same love goes into every concept we make.
          </p>
          <p>
            Handcrafted in small batches, with thoughtful ingredients and a soft
            spot for really good chocolate. This is our kind of comfort food.
          </p>
          <Link href="/about" className="text-link">
            A taste of our story <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="how-it-works section-wrap taste-ordering" data-reveal>
        <h2>
          Good things
          <br />
          <em>come in boxes.</em>
        </h2>
        <div className="ordering-steps">
          <div>
            <Cookie strokeWidth={1.3} />
            <h3>Find your concept</h3>
            <p>
              A classic cookie, a cookie cake, or a box made your way. Start
              with what you love.
            </p>
          </div>
          <div>
            <Package strokeWidth={1.3} />
            <h3>Make it yours</h3>
            <p>
              Choose your size, mix your flavors, and add a little something
              extra.
            </p>
          </div>
          <div>
            <MapPin strokeWidth={1.3} />
            <h3>We’ll take it from here</h3>
            <p>
              Choose next-day delivery or pickup in New Cairo. Your cookie
              moment is on its way.
            </p>
          </div>
        </div>
        <Link className="text-link" href="/shop">
          Explore the menu <ArrowRight size={18} />
        </Link>
      </section>
      <Reviews compact />
      <section className="pickup-note section-wrap">
        <span>See you in New Cairo.</span>
        <p>
          {pickupSettings.hoursNotice}
          <br />
          Delivery or pickup, choose what works for you.
        </p>
        <Link href="/contact" className="text-link">
          Say hello <ArrowUpRight size={18} />
        </Link>
      </section>
    </div>
  );
}
