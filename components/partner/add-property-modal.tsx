"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddPropertyForm } from "./add-property-form";

interface AddPropertyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPropertyModal({ open, onOpenChange }: AddPropertyModalProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // On mobile, redirect to page instead of opening modal
  useEffect(() => {
    if (open && isMobile) {
      onOpenChange(false);
      router.push("/partner/property/new");
    }
  }, [open, isMobile, onOpenChange, router]);

  // Don't render modal on mobile
  if (isMobile) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-lg mx-4 sm:mx-auto rounded-2xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Añadir una nueva propiedad</DialogTitle>
        </DialogHeader>
        <AddPropertyForm
          onSuccess={(propertyId) => {
            console.log("Modal onSuccess called with propertyId:", propertyId);
            console.log("Closing modal and navigating...");
            onOpenChange(false);
            // Use window.location for hard navigation to avoid RSC fetch issues
            setTimeout(() => {
              console.log("Navigating to:", `/partner/property/${propertyId}/edit`);
              window.location.href = `/partner/property/${propertyId}/edit`;
            }, 100);
          }}
          showTitle={false}
        />
      </DialogContent>
    </Dialog>
  );
}

