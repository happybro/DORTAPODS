# 🧹 Como Limpar a Base de Dados do DortaPods

## Opção 1: Via Supabase Dashboard (RECOMENDADO ✅)

### Passo a Passo:

1. **Abra o Supabase Dashboard**
   - URL: https://app.supabase.com
   - Faça login com sua conta

2. **Selecione o Projeto DORTAPODS**
   - Procure "DORTAPODS" na lista de projetos
   - Clique para abrir

3. **Vá para "SQL Editor"**
   - Menu esquerdo → SQL Editor
   - Clique em "New Query"

4. **Cole este código SQL:**

```sql
-- ============================================================
-- SCRIPT DE LIMPEZA - DORTAPODS
-- Deleta todos os dados mantendo a estrutura
-- ============================================================

-- Deletar em ordem de dependência (mais específico primeiro)
DELETE FROM movimentacoes;
DELETE FROM pedido_itens;
DELETE FROM pedidos;
DELETE FROM entradas;
DELETE FROM produtos;
```

5. **Execute o Query**
   - Botão **"Run"** (canto superior direito)
   - Ou pressione **Ctrl+Enter**

6. **Confirme**
   - Clique em "Confirm" se pedir

7. **Pronto!** ✨
   - A base de dados foi limpa
   - Recarregue o app: https://dortapods.vercel.app/

---

## Opção 2: Script no Console do Navegador

Se preferir fazer pelo console do navegador:

1. Abra o app: https://dortapods.vercel.app/
2. Pressione **F12** para abrir Developer Tools
3. Vá para aba **"Console"**
4. Cole o conteúdo do arquivo `limpar-banco.js`
5. Pressione **Enter**
6. Digite **"SIM"** quando pedir confirmação
7. O app recarregará automaticamente

---

## Opção 3: Reset Completo no Supabase

Se quiser resetar tudo inclusive as sequências de ID:

```sql
-- Deletar dados
DELETE FROM movimentacoes;
DELETE FROM pedido_itens;
DELETE FROM pedidos;
DELETE FROM entradas;
DELETE FROM produtos;

-- Resetar contadores de ID (opcional)
ALTER SEQUENCE movimentacoes_id_seq RESTART WITH 1;
ALTER SEQUENCE pedido_itens_id_seq RESTART WITH 1;
ALTER SEQUENCE pedidos_id_seq RESTART WITH 1;
ALTER SEQUENCE entradas_id_seq RESTART WITH 1;
ALTER SEQUENCE produtos_id_seq RESTART WITH 1;
```

---

## ⚠️ Importante

- **Esta ação é irreversível** - não há como recuperar os dados após deletar
- A **estrutura das tabelas permanece intacta** (apenas os dados são deletados)
- O **app continuará funcionando normalmente** após a limpeza
- Você pode **criar novos produtos e pedidos imediatamente**

---

## ✅ Após Limpar

1. Recarregue o app: https://dortapods.vercel.app/
2. Veja o Dashboard zerado:
   - 0 unidades
   - 0 pedidos
   - R$ 0,00 faturamento
3. Comece a usar o app do zero!

---

## 🆘 Se der Erro

Se receber erro de permissão:

1. Verifique se você está logado no Supabase
2. Tente deletar uma tabela por vez
3. Se persistir, entre em contato

## 📞 Dúvidas?

- Documentação: https://supabase.com/docs
- Dashboard: https://app.supabase.com
