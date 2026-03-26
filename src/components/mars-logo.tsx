"use client";

/* eslint-disable @next/next/no-img-element */
export function MarsLogo({
  variant = "black",
  className = "h-7",
}: {
  variant?: "black" | "white";
  className?: string;
}) {
  const src =
    variant === "white" ? "/logo-mars-white.png" : "/logo-mars-black.png";

  return (
    <img
      src={src}
      alt="MARS Cosmetics"
      className={`${className} w-auto object-contain`}
    />
  );
}
