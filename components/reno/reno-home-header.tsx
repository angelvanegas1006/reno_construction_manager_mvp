"use client";

import { useI18n } from "@/lib/i18n";

export function RenoHomeHeader() {
  const { t } = useI18n();

  return (
    <header className="border-b bg-card py-3 md:py-4 mb-3">
      <div className="pl-14 md:pl-6 pr-3 md:pr-6">
        <h1 className="text-lg md:text-xl lg:text-2xl font-semibold">{t.nav.home}</h1>
      </div>
    </header>
  );
}


