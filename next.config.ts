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
  // Configuración para webpack (usando --webpack flag en scripts)
  // Agregamos turbopack vacío para silenciar el warning en Next.js 16
  turbopack: {},
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
