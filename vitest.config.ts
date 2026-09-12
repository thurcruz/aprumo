import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // O Next resolve isso sozinho no bundler; fora dele (aqui) não existe
      // pacote nenhum instalado — só a marcação de intenção "roda no servidor".
      'server-only': resolve(__dirname, 'lib/test/server-only-stub.ts'),
    },
  },
  test: {
    // A lógica testada é pura (datas, recorrência, filtros): não precisa de DOM.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
