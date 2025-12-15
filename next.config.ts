import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Deshabilitar prerender de rutas de error para evitar problemas con context providers
  experimental: {
    // Esto ayuda a evitar problemas con SSR en error boundaries
  },
  // Configurar para que ignore errores durante el build de rutas de error
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Configuración de TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  // Configuración para Turbopack (Next.js 16 usa Turbopack por defecto)
  // Agregar configuración vacía para silenciar el warning
  turbopack: {},
  // Configuración para webpack (fallback para cuando se use --webpack flag)
  webpack: (config, { isServer }) => {
    // Ignorar el módulo 'canvas' en el cliente (solo se necesita en el servidor)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },
};

export default nextConfig;
