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
      { source: '/corpo', destination: '/extensoes', permanent: false },
      { source: '/corpo/:path*', destination: '/saude/:path*', permanent: false },
      // Saúde deixou de ser área: Treino, Sono e Antivício viraram extensões. /saude/sono continua existindo.
      { source: '/saude', destination: '/extensoes', permanent: false },
      { source: '/conhecimento', destination: '/mente', permanent: true },
      { source: '/financeiro', destination: '/financas', permanent: true },
      { source: '/goat-ai', destination: '/pri', permanent: true },
      { source: '/apri', destination: '/pri', permanent: true },
      // Planos saíram da Comunidade e viraram destino próprio. Temporário (307): a casa dos planos já mudou antes.
      // Hábitos, Agenda e Metas viraram visões do Hoje. A query (?dia=) segue junto.
      { source: '/tarefas', destination: '/hoje?visao=habitos', permanent: false },
      { source: '/agenda', destination: '/hoje?visao=agenda', permanent: false },
      { source: '/metas', destination: '/hoje?visao=metas', permanent: false },
      { source: '/comunidade', has: [{ type: 'query', key: 'aba', value: 'planos' }], destination: '/planos', permanent: false },
    ];
  },
};

export default nextConfig;
