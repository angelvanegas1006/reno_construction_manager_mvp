"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: Country[] = [
  { code: "ES", name: "España", flag: "🇪🇸", dialCode: "+34" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
  { code: "FR", name: "Francia", flag: "🇫🇷", dialCode: "+33" },
  { code: "IT", name: "Italia", flag: "🇮🇹", dialCode: "+39" },
  { code: "DE", name: "Alemania", flag: "🇩🇪", dialCode: "+49" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", dialCode: "+44" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", dialCode: "+1" },
  { code: "MX", name: "México", flag: "🇲🇽", dialCode: "+52" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57" },
];

interface CountryPhoneSelectorProps {
  countryCode?: string;
  phoneNumber?: string;
  onCountryChange: (countryCode: string) => void;
  onPhoneChange: (phoneNumber: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CountryPhoneSelector({
  countryCode = "+34",
  phoneNumber = "",
  onCountryChange,
  onPhoneChange,
  placeholder = "666 666 666",
  className,
  disabled = false,
}: CountryPhoneSelectorProps) {
  const selectedCountry = COUNTRIES.find((c) => c.dialCode === countryCode) || COUNTRIES[0];

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Country Selector */}
      <Select
        value={countryCode}
        onValueChange={onCountryChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm">{selectedCountry.dialCode}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((country) => (
            <SelectItem key={country.code} value={country.dialCode}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span>{country.dialCode}</span>
                <span className="text-muted-foreground ml-1">({country.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Phone Number Input */}
      <Input
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}






