"use client";

import * as React from "react";
import Image from "next/image";

// Uses a provided reference image placed at public/login-left.jpg
// Replace the file with your exact artwork to match the mock.
export function ArchitecturalWireframeBackground() {
  const [src, setSrc] = React.useState<string>("/login-left.jpeg");
  const tried = React.useRef<Set<string>>(new Set());
  const tryNext = () => {
    const order = ["/login-left.jpg", "/login-left.png", "/login-left.webp"];
    tried.current.add(src);
    const next = order.find((p) => !tried.current.has(p));
    if (next) setSrc(next);
    else tried.current.add("fallback");
  };
  return (
    <div className="relative h-full w-full bg-white">
      {tried.current.has("fallback") ? (
        // Fallback minimal placeholder if the image is missing
        <svg aria-hidden viewBox="0 0 1200 1200" className="absolute inset-0 h-full w-full">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M60 0 L0 0 0 60" fill="none" stroke="#f2f2f2" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="120%" height="120%" fill="url(#grid)" x="-10%" y="-10%" />
        </svg>
      ) : (
        <Image
          src={src}
          alt="Architectural wireframe"
          fill
          priority
          sizes="50vw"
          className="object-cover"
          onError={tryNext}
        />
      )}
    </div>
  );
}


