import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Excluir pdf-parse del bundler para que funcione correctamente en server-side
  // En Next.js 16.1.1+, serverExternalPackages está en el nivel superior, no en experimental
  serverExternalPackages: ['pdf-parse'],
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
    // Evitar que pdfjs-dist (usado por @react-pdf-viewer) cargue el paquete nativo 'canvas' en el cliente.
    // NormalModuleReplacementPlugin reemplaza cualquier require('canvas') por nuestro stub.
    // Asegurar que los alias se resuelvan correctamente (y en cliente: stub para canvas)
    if (config.resolve) {
      const alias: Record<string, string> = {
        ...(config.resolve.alias || {}),
        '@': path.resolve(__dirname),
      };
      if (!isServer) {
        const canvasStub = path.resolve(__dirname, 'lib/canvas-stub.js');
        alias['canvas'] = canvasStub;
        // Forzar que el canvas anidado en pdfjs-dist también use el stub
        alias[path.resolve(__dirname, 'node_modules/pdfjs-dist/node_modules/canvas')] = canvasStub;
      }
      config.resolve.alias = alias;
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ...(!isServer && { canvas: false }),
      };

      // Agregar extensiones para resolver módulos correctamente
      const extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
      config.resolve.extensions = [
        ...extensions.filter(ext => !config.resolve.extensions?.includes(ext)),
        ...(config.resolve.extensions || []),
      ];
    }

    return config;
  },
};

export default nextConfig;
