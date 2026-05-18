import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export para Cloudflare Pages
  // El output se genera en ./out y se sube directamente
  output: "export",

  // Necesario para que Cloudflare Pages enrute correctamente
  trailingSlash: true,

  // Sin optimización de imágenes (requiere servidor Node)
  images: { unoptimized: true },
};

export default nextConfig;
