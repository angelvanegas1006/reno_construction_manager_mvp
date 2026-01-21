"use client";

import { cn } from "@/lib/utils";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
}

export function CircularProgress({
  percentage,
  size = 48,
  strokeWidth = 4,
  className,
  showPercentage = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Color based on percentage: gray for 0%, blue for >0%
  const strokeColor = percentage === 0 
    ? "stroke-gray-300 dark:stroke-gray-600" 
    : "stroke-blue-600 dark:stroke-blue-400";
  
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "transition-all duration-300 ease-out",
            strokeColor
          )}
        />
      </svg>
      {/* Percentage text */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "text-xs font-semibold",
            percentage === 0 
              ? "text-gray-400 dark:text-gray-500" 
              : "text-blue-600 dark:text-blue-400"
          )}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}
