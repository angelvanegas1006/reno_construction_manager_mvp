"use client";

import { Globe, Check } from "lucide-react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useI18n, Language } from "@/lib/i18n";

const languages: { value: Language; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Globe className="h-4 w-4" />
        <span>{t.userMenu.language}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {languages.map((lang) => {
          const isSelected = language === lang.value;
          
          return (
            <DropdownMenuItem
              key={lang.value}
              onClick={() => handleLanguageChange(lang.value)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{lang.label}</span>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

