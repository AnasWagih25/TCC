import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";
export default function AboutPage() {
  return (
    <div className="editorial-page section-wrap">
      <header className="editorial-header">
        <h1>
          Good cookies.
          <br />
          <em>Better memories.</em>
        </h1>
        <p>
          We’re The Cookie Concept. A small cookie studio with a big love for
          baking, sharing, and making ordinary days a little sweeter.
        </p>
      </header>
      <div className="story-full">
        <div className="story-full-photo">
          <OptimizedImage
            src="/images/preview.png"
            alt="A Kinder cookie cake ready to share"
            fill
            priority
            sizes="(max-width: 700px) 100vw, 50vw"
          />
        </div>
        <div className="story-full-copy">
          <h2>
            From our kitchen
            <br />
            to your happy place.
          </h2>
          <p>
            What started as weekend baking for friends and family grew into a
            cookie studio focused on quality, comfort, and creativity in every
            box.
          </p>
          <p>
            Our founder personally tests every recipe, sources the ingredients,
            and bakes in small batches. Because the best part of a cookie isn’t
            just the first bite. It’s the moment you share it.
          </p>
          <Link href="/shop" className="button-chocolate">
            Find your favorite{" "}
            <span>
              <ArrowUpRight size={20} />
            </span>
          </Link>
        </div>
      </div>
      <div className="story-manifesto" data-reveal>
        <p>
          Thoughtful ingredients.
          <br />A generous helping of chocolate.
          <br />
          <em>Always baked with heart.</em>
        </p>
        <Link href="/contact" className="text-link">
          Say hello to the studio <ArrowUpRight size={19} />
        </Link>
      </div>
    </div>
  );
}
