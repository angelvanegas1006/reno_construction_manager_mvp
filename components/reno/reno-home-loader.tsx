"use client";

import { cn } from "@/lib/utils";

interface RenoHomeLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RenoHomeLoader({ className, size = "md" }: RenoHomeLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const dotSizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className={cn(
      "flex items-center justify-center w-full",
      className
    )}>
      {/* Spinner */}
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderTopColor: "var(--prophero-blue-500)",
            borderRightColor: "var(--prophero-blue-400)",
          }}
        />
        {/* Inner ring */}
        <div 
          className="absolute inset-2 rounded-full border-4 border-transparent animate-spin"
          style={{
            borderBottomColor: "var(--prophero-blue-600)",
            borderLeftColor: "var(--prophero-blue-300)",
            animationDirection: "reverse",
            animationDuration: "1s",
          }}
        />
        {/* Center dot */}
        <div 
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse",
            dotSizeClasses[size]
          )}
          style={{
            backgroundColor: "var(--prophero-blue-500)",
            animationDuration: "1.5s",
          }}
        />
      </div>
    </div>
  );
}

