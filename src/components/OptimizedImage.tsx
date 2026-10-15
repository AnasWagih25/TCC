"use client";

import { useState, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import { resolveImageUrl } from "@/context/CartContext";

type OptimizedImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: CSSProperties["objectFit"];
  loading?: "lazy" | "eager";
  fallbackSrc?: string;
  onClick?: (event: MouseEvent) => void;
};

/** Keep uploaded, inline and local images on the same sizing and fallback path. */
export default function OptimizedImage({
  src,
  alt,
  className,
  style,
  fill = false,
  width = 400,
  height = 400,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  objectFit = "cover",
  loading,
  fallbackSrc = "/images/preview.png",
  onClick,
}: OptimizedImageProps) {
  const resolved = resolveImageUrl(typeof src === "string" ? src.trim() : "");
  const fallback = resolveImageUrl(fallbackSrc);
  const [failure, setFailure] = useState<{
    source: string;
    stage: "direct" | "fallback";
  } | null>(null);
  const stage = failure?.source === resolved ? failure.stage : null;
  const displaySource = stage === "fallback" ? fallback : resolved;
  const remote = /^https?:/.test(resolved);
  // Retain the image cache, retry a failed optimizer directly, then use the local cake.
  const direct = /^(data:|blob:)/.test(displaySource) || stage === "direct";
  return (
    <Image
      key={`${displaySource}-${stage || "optimized"}`}
      src={displaySource}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      priority={priority}
      loading={priority ? undefined : loading}
      sizes={sizes}
      unoptimized={direct}
      className={className}
      style={{ objectFit, ...style }}
      onError={() => {
        if (displaySource !== fallback)
          setFailure({
            source: resolved,
            stage: remote && stage !== "direct" ? "direct" : "fallback",
          });
      }}
      onClick={onClick}
    />
  );
}
