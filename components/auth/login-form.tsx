"use client";

import { VistralLogo } from "@/components/vistral-logo";
import { useI18n } from "@/lib/i18n";
import { Auth0LoginButton } from "@/components/auth/auth0-login-button";

export function LoginForm() {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo */}
      <div className="flex justify-center mb-2">
        <VistralLogo className="h-12" />
      </div>

      {/* Título y subtítulo */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">
          {t.login.title}
        </h1>
        <p className="text-base text-muted-foreground dark:text-muted-foreground">
          {t.login.subtitle}
        </p>
      </div>

      {/* Botón Auth0 — mismo tamaño y estilo que el botón original */}
      <div className="pt-2">
        <Auth0LoginButton />
      </div>
    </div>
  );
}
