"use client";

import Image from "next/image";

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
    <Image
      src={src}
      alt="MARS Cosmetics"
      width={280}
      height={72}
      className={className}
      style={{ width: "auto" }}
      priority
    />
  );
}
