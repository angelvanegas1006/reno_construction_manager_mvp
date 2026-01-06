"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FloatingAddButtonProps {
  onAddProperty?: () => void;
}

export function FloatingAddButton({ onAddProperty }: FloatingAddButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find the scrollable container (main content area)
    const findScrollContainer = () => {
      const mainContent = document.querySelector('[data-scroll-container]');
      if (mainContent) {
        scrollContainerRef.current = mainContent as HTMLElement;
      } else {
        // Fallback to window scroll
        scrollContainerRef.current = null;
      }
    };

    findScrollContainer();

    const handleScroll = () => {
      const scrollContainer = scrollContainerRef.current;
      const currentScrollY = scrollContainer
        ? scrollContainer.scrollTop
        : window.scrollY || document.documentElement.scrollTop;

      // Show button when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY) {
        // Scrolling up - always show
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px - hide
        setIsVisible(false);
      } else if (currentScrollY === 0) {
        // At top - always show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    // Only add scroll listener on mobile
    const checkMobile = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        const container = scrollContainerRef.current;
        if (container) {
          container.addEventListener("scroll", handleScroll, { passive: true });
        } else {
          window.addEventListener("scroll", handleScroll, { passive: true });
        }
      }
    };

    checkMobile();

    return () => {
      const container = scrollContainerRef.current;
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [lastScrollY]);

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 md:hidden transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <Button
        onClick={onAddProperty}
        size="lg"
        className="rounded-full shadow-lg h-14 w-14 p-0"
        aria-label="Añadir propiedad"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

