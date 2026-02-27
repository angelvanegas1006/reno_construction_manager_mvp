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

      {/* Title */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t.login.title}
        </h1>
        <p className="text-base text-muted-foreground">
          {t.login.subtitle}
        </p>
      </div>

      {/* Auth0 login */}
      <div className="pt-2">
        <Auth0LoginButton />
      </div>
    </div>
  );
}
