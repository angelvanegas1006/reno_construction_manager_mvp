import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Importar suppressores de errores ANTES que cualquier otro código
import "@/lib/supabase/suppress-auth-errors";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { FaviconSwitcher } from "@/components/favicon-switcher";
import { I18nProvider } from "@/lib/i18n";
import { ConditionalAuthProviders } from "@/components/providers/conditional-auth-providers";

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
            <ConditionalAuthProviders>
              {children}
              <Toaster />
            </ConditionalAuthProviders>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
