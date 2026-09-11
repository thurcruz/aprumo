import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, '.') } },
  test: {
    // A lógica testada é pura (datas, recorrência, filtros): não precisa de DOM.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
