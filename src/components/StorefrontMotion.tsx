"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Storytelling stays on the storefront; checkout retains ordinary scrolling. */
export default function StorefrontMotion() {
  useGSAP(() => {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    const root = document.querySelector<HTMLElement>(".taste-storefront");
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        gsap.from(".cake-hero-copy > *", {
          y: 20,
          opacity: 0.65,
          duration: 0.85,
          stagger: 0.09,
          ease: "power3.out",
          clearProps: "transform,opacity",
        });
        gsap.fromTo(
          ".taste-story .story-photo img",
          { scale: 1.1 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".taste-story",
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          },
        );
      }, root);
      return () => context.revert();
    });
    media.add(
      "(min-width: 1051px) and (prefers-reduced-motion: no-preference)",
      () => {
        const title = root.querySelector<HTMLElement>(".menu-discovery-title");
        const gallery = root.querySelector<HTMLElement>(".featured-products");
        if (!title || !gallery) return;
        const trigger = ScrollTrigger.create({
          trigger: title,
          start: "top top",
          endTrigger: gallery,
          end: "bottom bottom-=80",
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,
        });
        return () => trigger.kill(true);
      },
    );
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    const refreshImages = () => ScrollTrigger.refresh();
    root.addEventListener("load", refreshImages, true);
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("load", refreshImages, true);
      media.revert();
    };
  }, []);
  return null;
}
