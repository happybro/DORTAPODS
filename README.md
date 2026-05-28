# 🚀 DORTAPODS — Controle de Estoque & Vendas

App de controle de estoque e pedidos para pods descartáveis.

- ✅ **Funcional 100%** — todas as features
- ✅ **Online** — dados na nuvem com Supabase
- ✅ **Smartphone** — interface mobile-first, instala como app
- ✅ **Gratuito** — Supabase + Vercel (sem cobranças)
- ✅ **Rápido** — interface simplificada para pedidos
- ✅ **Sincronizado** — funciona em múltiplos celulares

**Link:** https://project-04vur.vercel.app/

---

## 🎯 Recursos Principais

### Dashboard
- Estoque total em tempo real
- Total de pedidos (pendentes e finalizados)
- Faturamento e lucro bruto
- Últimas movimentações
- Alerta de estoque crítico

### Produtos
- Criar, editar, excluir produtos
- Controlar preço de compra e venda
- Visualizar estoque em tempo real
- Calcular margem de lucro
- Filtrar por status (todos, baixo, zerado)

### Entrada de Estoque
- Adicionar produtos manualmente
- **Colar lista formatada** — importa vários produtos de uma vez
- Histórico de entradas

### Pedidos (NOVO - SIMPLIFICADO!)
- **Lista de produtos visível** — vê todos os disponíveis
- **Filtro rápido** — busca por nome enquanto digita
- **Adicionar com um clique** — botão [+] para cada produto
- **Carrinho flutuante** — vê total e lucro em tempo real
- **Editar preço** — desconto ou margem extra na hora
- Finalizar ou salvar como pendente
- Ver lucro do pedido

### Histórico de Vendas
- Listar todos os pedidos
- Filtrar por status (pendentes, finalizados)
- Ver detalhes completos (cliente, data, itens, total, lucro)
- Editar pedido depois de finalizar
- Gerar mensagem WhatsApp automática

### WhatsApp
- Gerar mensagem automática do pedido
- Gerar lista de estoque disponível para compartilhar
- Copiar e colar direto no WhatsApp

---

## 🏗 Arquitetura

**Backend:** Supabase (PostgreSQL + autenticação)
- `produtos` — nome, sabor, preço, estoque
- `pedidos` — cliente, status, total, lucro
- `pedido_itens` — itens de cada pedido
- `entradas` — registro de compras
- `movimentacoes` — histórico completo

**Frontend:** HTML + CSS + JavaScript puro (sem dependências)
- Interface mobile-first responsiva
- Cache em memória (rápido)
- Sincronização automática com Supabase
- Sanitização e validações

---

## 🚀 Como Usar

1. Abra: https://project-04vur.vercel.app/
2. Crie/edite produtos
3. Registre entrada de estoque
4. Crie pedidos (novo: super rápido com a lista visual!)
5. Finalize e veja lucro
6. Compartilhe no WhatsApp

---

## 🆘 Troubleshooting

| Problema | Solução |
|----------|---------|
| Página branca | Limpe cache (Ctrl+Shift+Del) e recarregue |
| Sem conexão | App funciona do cache, sincroniza quando voltar |
| Erros no console | Verifique credenciais em `js/config.js` |

---

## 📝 Últimas Mudanças

- **Novo:** Interface de pedidos simplificada com lista visual
- **Novo:** Filtro rápido de produtos
- **Novo:** Adicionar produto com um clique [+]
- **Novo:** Carrinho sempre visível com total e lucro

---

**Desenvolvido para DortaPods** 🍃
Controle profissional de estoque e vendas para pods descartáveis.
