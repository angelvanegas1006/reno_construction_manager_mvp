"use client";

import { RenoPropertiesProvider } from "@/contexts/reno-properties-context";

export default function ArchitectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RenoPropertiesProvider>
      {children}
    </RenoPropertiesProvider>
  );
}
