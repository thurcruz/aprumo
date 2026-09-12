// Substitui `server-only` nos testes (vitest.config.ts). O pacote de verdade só
// existe para o bundler do Next barrar import de código de servidor no cliente;
// fora dele não há nada para instalar, e os testes não rodam num bundle de cliente.
export {}
