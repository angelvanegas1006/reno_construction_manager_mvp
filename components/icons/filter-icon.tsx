export function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Two horizontal lines with circles on the left */}
      {/* Top line */}
      <circle cx="3" cy="5" r="1.5" fill="currentColor" />
      <line
        x1="5.5"
        y1="5"
        x2="13"
        y2="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      
      {/* Bottom line */}
      <circle cx="3" cy="11" r="1.5" fill="currentColor" />
      <line
        x1="5.5"
        y1="11"
        x2="13"
        y2="11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

