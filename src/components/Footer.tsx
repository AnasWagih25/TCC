import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link className="footer-invitation" href="/shop">
          Make room
          <br />
          for a little joy.
          <span className="footer-arrow">
            <ArrowUpRight strokeWidth={1} />
          </span>
        </Link>
        <div className="footer-navigation">
          <nav aria-label="Footer navigation">
            <Link href="/shop">The menu</Link>
            <Link href="/about">Our story</Link>
            <Link href="/reviews">Customer reviews</Link>
            <Link href="/contact">Get in touch</Link>
          </nav>
          <p>
            Cookies, cookie cakes
            <br />& very good company.
            <br />
            <span>Made in Cairo, Egypt.</span>
          </p>
        </div>
      </div>
      <div className="footer-wordmark" aria-hidden="true">
        cookie concept.
      </div>
      <div className="footer-base">
        <span>© {new Date().getFullYear()} The Cookie Concept</span>
        <span>A good idea. An even better cookie.</span>
        <Link href="/admin/login">
          Staff portal <ArrowUpRight size={13} />
        </Link>
      </div>
    </footer>
  );
}
