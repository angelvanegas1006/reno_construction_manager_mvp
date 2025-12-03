import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { FaviconSwitcher } from "@/components/favicon-switcher";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { SupabaseAuthProvider } from "@/lib/auth/supabase-auth-context";
import { AppAuthProvider } from "@/lib/auth/app-auth-context";
import { Auth0ProviderWrapper } from "@/components/auth/auth0-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vistral By Prophero",
  description: "Vistral - Construction Management Platform",
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

// Disable static generation for this layout to avoid SSR issues with context
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <FaviconSwitcher />
          <I18nProvider>
            {/* Auth0Provider para Auth0 SDK */}
            <Auth0ProviderWrapper>
              {/* AuthProvider original para compatibilidad con código existente */}
              <AuthProvider>
                {/* Providers de Supabase para nueva funcionalidad */}
                <SupabaseAuthProvider>
                  <AppAuthProvider>
                    <MixpanelProvider>
                      {children}
                      <Toaster />
                    </MixpanelProvider>
                  </AppAuthProvider>
                </SupabaseAuthProvider>
              </AuthProvider>
            </Auth0ProviderWrapper>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
