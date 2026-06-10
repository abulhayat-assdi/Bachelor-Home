"use client";

import * as React from "react";
import { cn, getInitials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  color,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showImg = src && !failed;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color ?? "#6C63FF",
        fontSize: size * 0.38,
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
