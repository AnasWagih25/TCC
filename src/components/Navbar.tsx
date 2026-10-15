"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import ThemeSwitch from "./ThemeSwitch";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "/shop", label: "The menu" },
  { href: "/about", label: "Our story" },
  { href: "/reviews", label: "Your cookie stories" },
  { href: "/contact", label: "Say hello" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { cart } = useCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <>
      <div className="announcement">
        <span>A little cookie joy, made in Cairo.</span>
        <Link href="/shop">
          Find your favorite <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="site-header">
        <Link
          href="/"
          className="brand-mark"
          aria-label="The Cookie Concept home"
          onClick={() => setOpen(false)}
        >
          <span>the</span>
          <strong>cookie concept.</strong>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeSwitch />
          <Link
            href="/cart"
            className="bag-link"
            aria-label={`Your bag, ${count} items`}
            onClick={() => setOpen(false)}
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
            <span className="bag-label">Your bag</span>
            <span className="bag-count">{count}</span>
          </Link>
          <button
            className="mobile-menu-button icon-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span
              className={`menu-lines ${open ? "is-open" : ""}`}
              aria-hidden="true"
            >
              <span />
              <span />
            </span>
          </button>
        </div>
        {open && (
          <nav
            id="mobile-menu"
            className="mobile-menu"
            aria-label="Mobile navigation"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {link.label}
                <ArrowUpRight size={22} />
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
