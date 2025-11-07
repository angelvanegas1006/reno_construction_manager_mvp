"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSelect() {
  const [lang, setLang] = useState("EN");

  return (
    <Select value={lang} onValueChange={setLang}>
      <SelectTrigger className="w-[90px]">
        <SelectValue placeholder="EN" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="EN">EN</SelectItem>
        <SelectItem value="ES">ES</SelectItem>
      </SelectContent>
    </Select>
  );
}








