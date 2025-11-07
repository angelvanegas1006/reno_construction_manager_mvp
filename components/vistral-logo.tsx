import Image from "next/image";
import { cn } from "@/lib/utils";

interface VistralLogoProps {
  className?: string;
  variant?: "light" | "dark" | null;
}

export function VistralLogo({ className, variant }: VistralLogoProps) {
  // If variant is null, use theme-aware colors
  const useTheme = variant === null || variant === undefined;
  const textColor = useTheme 
    ? undefined // Use default text color (theme-aware)
    : variant === "dark" 
      ? "#ffffff" 
      : "#1e293b";

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      {/* SVG Logo from public folder */}
      <div className="flex-shrink-0 relative" style={{ width: 32, height: 32 }}>
        <Image
          src="/vistral-logo.svg"
          alt="Vistral Logo"
          width={32}
          height={32}
          className="object-contain"
          priority
          unoptimized
        />
      </div>
      
      <div className="flex flex-col min-w-0">
        <span 
          className={cn("text-sm font-bold leading-tight whitespace-nowrap", !useTheme && "text-foreground")} 
          style={textColor ? { color: textColor } : undefined}
        >
          VISTRAL
        </span>
        <span 
          className={cn("text-xs font-light leading-tight whitespace-nowrap", !useTheme && "text-foreground")} 
          style={textColor ? { color: textColor } : undefined}
        >
          by PropHero
        </span>
      </div>
    </div>
  );
}

