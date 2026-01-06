"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

type ThemeOption = "light" | "dark" | "system";

export function ThemeSelector() {
  const { theme, setTheme, systemTheme } = useTheme();
  const { t } = useI18n();
  const currentTheme = (theme || "system") as ThemeOption;

  const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
    { value: "light", label: t.theme.light, icon: Sun },
    { value: "dark", label: t.theme.dark, icon: Moon },
    { value: "system", label: t.theme.auto, icon: Monitor },
  ];

  const handleThemeChange = (newTheme: ThemeOption) => {
    setTheme(newTheme);
  };

  const getCurrentIcon = () => {
    if (currentTheme === "system") {
      const effectiveTheme = systemTheme || "light";
      return effectiveTheme === "dark" ? Moon : Sun;
    }
    const current = themeOptions.find((opt) => opt.value === currentTheme);
    return current?.icon || Sun;
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <CurrentIcon className="h-4 w-4" />
        <span>{t.userMenu.theme}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = currentTheme === option.value;
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

