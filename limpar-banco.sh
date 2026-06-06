#!/bin/bash

# Script para limpar a base de dados do DortaPods
# Deleta todos os dados mantendo a estrutura das tabelas

SUPABASE_URL="https://tkkmmswpbkgthlemvrgq.supabase.co"
SUPABASE_KEY="sb_publishable_6aDQoFeuc5UAZn_HZmX4Pw_lEYPOyTN"

echo "🧹 Iniciando limpeza da base de dados..."
echo "⚠️  AVISO: Todos os dados serão deletados permanentemente!"
read -p "Digite 'SIM' para confirmar: " confirma

if [ "$confirma" != "SIM" ]; then
  echo "❌ Operação cancelada"
  exit 1
fi

echo "🗑️ Deletando dados..."

# Deletar movimentacoes (dependências limpas primeiro)
curl -X DELETE "${SUPABASE_URL}/rest/v1/movimentacoes" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" && echo "✅ Movimentações deletadas"

# Deletar pedido_itens
curl -X DELETE "${SUPABASE_URL}/rest/v1/pedido_itens" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" && echo "✅ Itens de pedidos deletados"

# Deletar pedidos
curl -X DELETE "${SUPABASE_URL}/rest/v1/pedidos" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" && echo "✅ Pedidos deletados"

# Deletar entradas
curl -X DELETE "${SUPABASE_URL}/rest/v1/entradas" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" && echo "✅ Entradas deletadas"

# Deletar produtos
curl -X DELETE "${SUPABASE_URL}/rest/v1/produtos" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" && echo "✅ Produtos deletados"

echo ""
echo "✨ Base de dados limpa com sucesso!"
echo "🎉 Recarregue o app para ver as mudanças: https://dortapods.vercel.app/"
