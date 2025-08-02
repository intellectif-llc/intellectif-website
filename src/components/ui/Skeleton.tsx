import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export default function Skeleton({ className = "", width, height }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b] bg-[length:200%_100%] rounded ${className}`}
      style={{
        width,
        height,
        animation: "skeleton-loading 1.5s ease-in-out infinite",
      }}
    />
  );
}

// Add the keyframe animation to your globals.css
export const skeletonStyles = `
@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
`;