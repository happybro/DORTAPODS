// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO POCKETBASE
// ══════════════════════════════════════════════════════════════════
// Substitua POCKETBASE_URL com a URL do seu Pocketbase
// Opções:
// - Render (recomendado): https://seu-projeto.onrender.com
// - Local: http://localhost:8090

const POCKETBASE_URL = 'https://dortapods-pocketbase.onrender.com'; // ← ALTERAR AQUI

// Não alterar nada abaixo
const pb = new PocketBase(POCKETBASE_URL);

console.log(`[Pocketbase] Conectando a: ${POCKETBASE_URL}`);
