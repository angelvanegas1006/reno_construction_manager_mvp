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
};

export default nextConfig;
