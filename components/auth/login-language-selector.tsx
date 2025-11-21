"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, Language } from "@/lib/i18n";

const languages: { value: Language; label: string; flag: string }[] = [
  { value: "es", label: "ES", flag: "🇪🇸" },
  { value: "en", label: "ENG", flag: "🇬🇧" },
];

export function LoginLanguageSelector() {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);

  const currentLang = languages.find(lang => lang.value === language) || languages[0];

  return (
    <Select 
      value={language} 
      onValueChange={(value) => setLanguage(value as Language)}
      onOpenChange={setOpen}
    >
      <SelectTrigger className="w-[90px] h-9 border-border bg-background hover:bg-accent text-foreground pr-2 [&>span:first-child]:hidden [&>svg]:hidden">
        <SelectValue className="hidden" />
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-base leading-none flex-shrink-0">{currentLang.flag}</span>
          <span className="text-sm font-medium">{currentLang.label}</span>
        </div>
        <ChevronUp 
          className={`h-4 w-4 ml-auto transition-transform flex-shrink-0 text-muted-foreground ${open ? 'rotate-180' : ''}`}
        />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <div className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

