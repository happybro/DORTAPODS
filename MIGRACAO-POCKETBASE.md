# 🚀 Migração para Pocketbase - Guia Rápido

## 📋 Checklist de Passos

### FASE 1: Setup Pocketbase (20 minutos)

- [ ] **Passo 1:** Abrir https://render.com
- [ ] **Passo 2:** Fazer login/criar conta
- [ ] **Passo 3:** Conectar repositório GitHub `happybro/DORTAPODS`
- [ ] **Passo 4:** Criar novo Web Service com:
  - Name: `dortapods-pocketbase`
  - Environment: Docker
  - Plan: Free
- [ ] **Passo 5:** Aguardar build terminar (~5 minutos)
- [ ] **Passo 6:** Copiar URL: `https://dortapods-pocketbase.onrender.com`

### FASE 2: Criar Coleções (15 minutos)

- [ ] **Passo 1:** Acessar `https://dortapods-pocketbase.onrender.com/_/`
- [ ] **Passo 2:** Criar admin account
- [ ] **Passo 3:** Criar 4 coleções:

#### Coleção 1: PRODUTOS
```
nome (text) - obrigatório
sabor (text) - obrigatório
compra (number) - obrigatório
venda (number) - obrigatório
estoque (number) - obrigatório
```

#### Coleção 2: PEDIDOS
```
cliente (text) - obrigatório
obs (text)
status (select: pendente, finalizado) - obrigatório
total (number) - obrigatório
lucro (number) - obrigatório
itens (json) - obrigatório
```

#### Coleção 3: ENTRADAS
```
prodId (text) - obrigatório
qtd (number) - obrigatório
valor_compra (number)
```

#### Coleção 4: MOVIMENTACOES
```
prodId (text) - obrigatório
delta (number) - obrigatório
tipo (select: entrada, saida) - obrigatório
referencia (text)
```

- [ ] **Passo 4:** Criar coleção USUARIOS:
```
email (text/email) - obrigatório
password (password) - obrigatório
name (text)
```

### FASE 3: Configurar Segurança (5 minutos)

Para cada coleção, vá em "API Rules" e defina:

```json
// Create
@request.auth.id != ""

// Read
@request.auth.id != ""

// Update
@request.auth.id != ""

// Delete
@request.auth.id != ""
```

### FASE 4: Atualizar Código (5 minutos)

- [ ] **Passo 1:** Abrir `js/pocketbase-config.js`
- [ ] **Passo 2:** Alterar a linha:
```javascript
const POCKETBASE_URL = 'https://seu-url-aqui.onrender.com';
```

- [ ] **Passo 3:** Salvar arquivo
- [ ] **Passo 4:** Fazer commit e push:
```bash
git add js/pocketbase-config.js
git commit -m "Configurar URL do Pocketbase"
git push origin main
```

### FASE 5: Atualizar HTML (2 minutos)

No `index.html`, ANTES do `</body>`, adicione:

```html
<!-- Pocketbase SDK -->
<script src="https://cdn.jsdelivr.net/npm/pocketbase@0.20.4/dist/pocketbase.umd.js"></script>

<!-- Configuração Pocketbase -->
<script src="js/pocketbase-config.js"></script>
<script src="js/pocketbase.api.js"></script>
```

---

## ✅ Resultado Final

Após completar tudo:

✅ **Pocketbase rodando na nuvem** (Render)
✅ **Coleções criadas e seguras**
✅ **App conectado ao Pocketbase**
✅ **Dados salvam automaticamente**
✅ **Multi-dispositivo funcionando**
✅ **100% Grátis e infinito**

---

## 🎯 Próximas Ações

1. Depois de tudo pronto, Claude vai:
   - Adaptar as APIs para usar Pocketbase
   - Testar tudo funcionando
   - Fazer deploy na Vercel

2. Você faz:
   - Seguir os passos acima
   - Passar a URL do Pocketbase para Claude
   - Confirmar tudo está funcionando

---

## 📞 Suporte Rápido

**Se algo der errado:**

| Problema | Solução |
|----------|---------|
| Deploy trava no Render | Aguarde 10 min, depois clique "Manual Deploy" |
| Não consigo acessar admin | Verificar URL, aguardar 2 min |
| Erro de permissão | Verificar se usuário está autenticado |
| Dados não aparecem | Recarregar página ou limpar cache (Ctrl+Shift+R) |

---

**Bora começar? 🚀**

Depois que terminar o setup, é só avisar Claude que está tudo pronto!
