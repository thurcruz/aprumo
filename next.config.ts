import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Rotas renomeadas. Os redirects preservam links e favoritos antigos;
  // podem ser removidos quando não houver mais tráfego neles.
  //
  // Saúde virou Corpo na V1 e voltou a ser Saúde. O redirect de /corpo é
  // TEMPORÁRIO (307) de propósito: navegadores guardam redirects permanentes
  // (308) para sempre, e esta área já trocou de nome duas vezes — um 308 aqui
  // prenderia quem o tivesse em cache se o nome mudasse de novo.
  async redirects() {
    return [
      { source: '/dashboard', destination: '/hoje', permanent: true },
      { source: '/corpo', destination: '/saude', permanent: false },
      { source: '/corpo/:path*', destination: '/saude/:path*', permanent: false },
      { source: '/conhecimento', destination: '/mente', permanent: true },
      { source: '/financeiro', destination: '/financas', permanent: true },
      { source: '/goat-ai', destination: '/pri', permanent: true },
      { source: '/apri', destination: '/pri', permanent: true },
    ];
  },
};

export default nextConfig;
