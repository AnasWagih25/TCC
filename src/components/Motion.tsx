"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Motion() {
  const path = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.animate(
              [
                { opacity: 0.65, transform: "translateY(20px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 650,
                easing: "cubic-bezier(.16,1,.3,1)",
                fill: "none",
              },
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [path]);
  return null;
}
