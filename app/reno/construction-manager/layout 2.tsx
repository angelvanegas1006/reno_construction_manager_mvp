"use client";

import { RenoPropertiesProvider } from "@/contexts/reno-properties-context";

export default function RenoConstructionManagerLayout({
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

