# 🚀 PodManager — Sistema Completo de Estoque & Vendas

App de controle de estoque e pedidos para pods descartáveis.

- ✅ **Funcional 100%** — todas as features do original
- ✅ **Online** — dados na nuvem com Supabase
- ✅ **Smartphone** — interface mobile-first, instala como app
- ✅ **Gratuito** — Supabase + Vercel/Netlify (sem cobranças)
- ✅ **Offline parcial** — funciona sem internet (cache)
- ✅ **Migração automática** — traz dados do localStorage

---

## 🎯 Começar em 15 minutos

### 1️⃣ Configurar Supabase (banco de dados grátis)

1. Acesse https://supabase.com → **Sign Up**
2. Crie conta (email ou GitHub)
3. Clique em **"New Project"**
4. Preencha projeto (ex: `podmanager`), escolha senha e região
5. Aguarde criar (2-3 min)

**Copie 2 valores:**
- Vá em **Settings** → **API**
- Copie **Project URL** (ex: `https://xxxxx.supabase.co`)
- Copie **Anon public key** (chave longa)

### 2️⃣ Executar o SQL (criar tabelas)

1. No Supabase, clique em **SQL Editor** → **New Query**
2. Abra o arquivo `sql/schema.sql` (da pasta do projeto)
3. Cole TODO o conteúdo
4. Clique em **"Run"**
5. Pronto! ✓

### 3️⃣ Configurar credenciais

1. Abra o arquivo `js/config.js`
2. Substitua os valores placeholder pelos que copiou:

```javascript
export const SUPABASE_URL      = 'https://seu-projeto.supabase.co';
export const SUPABASE_ANON_KEY = 'sua-chave-aqui';
```

3. Salve (Ctrl+S)

### 4️⃣ Colocar na web

**Escolha A — Vercel (recomendado):**
1. Acesse https://vercel.com → **Sign Up** (com GitHub é mais fácil)
2. Clique em **"Add New"** → **"Project"**
3. Escolha **"Deploy Manually"**
4. Arraste a pasta `dortapods` (ou faça upload dos arquivos)
5. Clique em **"Deploy"**
6. Pronto! Você ganha um link tipo: `https://podmanager-xyz.vercel.app`

**Escolha B — Netlify:**
1. Acesse https://netlify.com → **Sign up**
2. Arraste a pasta `dortapods` para a área **"Drag and drop"**
3. Pronto! Você ganha um link tipo: `https://podmanager-xyz.netlify.app`

### 5️⃣ Acessar no smartphone

1. Pegue o link e compartilhe com seu celular
2. Abra no navegador
3. Clique em compartilhar → **"Adicionar à tela inicial"** (Android) ou **"Adicionar ao início"** (iOS)
4. Seu app fica com um ícone na tela inicial do celular! 📱

---

## 📊 Recursos

### Dashboard
- Estoque total
- Pedidos (total, pendentes, finalizados)
- Faturamento
- Lucro bruto
- Últimas movimentações

### Produtos
- Criar, editar, excluir
- Controlar preço de compra e venda
- Ver estoque em tempo real
- Filtrar por status (todos, baixo, zerado)
- Calcular margem de lucro

### Entrada de Estoque
- Adicionar produtos manualmente
- **Colar lista** — copie e cole uma lista de produtos (formato simples)
- Histórico de entradas

### Pedidos
- Criar pedido (nome cliente + observação)
- Buscar produtos com autocomplete
- Ajustar quantidade
- **Editar preço na hora** (desconto, margem extra)
- Finalizar ou salvar como pendente
- Ver lucro do pedido

### Histórico de Vendas
- Listar todos os pedidos
- Filtrar por status (pendentes, finalizados)
- Ver detalhes (cliente, data, itens, total, lucro)
- Editar pedido depois
- Gerar mensagem WhatsApp com o pedido

### WhatsApp
- Gerar mensagem automática do pedido
- Gerar lista de estoque disponível
- Copiar mensagem — colar direto no WhatsApp

---

## 🏗 Arquitetura

### Backend (Supabase)

**Tabelas:**
- `produtos` — nome, sabor, preço compra/venda, estoque
- `pedidos` — cliente, observação, status, total, lucro
- `pedido_itens` — itens de cada pedido
- `entradas` — registro de compras de estoque
- `movimentacoes` — histórico de todas as ações

**Segurança:**
- RLS (Row Level Security) habilitado
- RPC atômica para estoque (não permite negativo)
- Triggers automáticos para timestamps

### Frontend (JavaScript)

**Modular:**
- `config.js` — credenciais
- `supabase.js` — cliente Supabase
- `state.js` — cache em memória
- `utils.js` — funções auxiliares + tratamento de erro
- `*.api.js` — CRUD de cada entidade
- `app.js` — toda lógica da UI
- `migrar.js` — transferência automática do localStorage

---

## 🔄 Fluxo de dados

```
Usuário interage com UI
        ↓
app.js chama função API
        ↓
produtos.api.js / pedidos.api.js / etc
        ↓
sb.from('tabela').operation()
        ↓
Supabase (banco de dados)
        ↓
Resposta volta
        ↓
state.js atualiza cache
        ↓
UI rerenderiza
```

---

## ⚙️ Migração do localStorage

**Na primeira vez que abre:**

1. Detecta dados antigos no localStorage
2. Verifica se Supabase já tem dados
3. Se não tem, migra automaticamente:
   - Produtos
   - Pedidos + itens
   - Entradas
   - Movimentações
4. Limpa localStorage (seguro)

**Depois disso:**
- Tudo é salvo em Supabase
- localStorage nunca mais é usado
- Funciona em qualquer dispositivo

---

## 🔒 Segurança

- Credenciais só no `config.js` (mude se for publicar em Git)
- Sanitização de inputs (evita XSS)
- Validações no frontend
- RLS no banco (só quem pode ver, vê)
- HTTPS obrigatório (Vercel/Netlify)

---

## 📱 Offline (parcial)

- Enquanto online: salva tudo em Supabase
- Se internet cair: UI continua respondendo (cache em memória)
- Quando volta internet: sincroniza automaticamente

**Nota:** Para offline completo, seria preciso adicionar Service Worker (próxima versão).

---

## 🆘 Troubleshooting

| Erro | Solução |
|------|---------|
| "Erro de autenticação" | Volte no Supabase e copie URL + Key novamente em `config.js` |
| "Tabelas não existem" | Cole o `schema.sql` no SQL Editor do Supabase e clique Run |
| "Sem conexão com internet" | App está offline, verifica conexão. Quando voltar, sincroniza |
| Página em branco | Verifica console (F12) — tem erro? Vem no schema.sql ou config.js |

---

## 📚 Estrutura de arquivos

```
dortapods/
├── podmanager.html          HTML (layout + modais)
├── SETUP.md                 Guia passo-a-passo (LEIA PRIMEIRO!)
├── README.md                Este arquivo
├── sql/
│   └── schema.sql           SQL para criar banco (execute no Supabase)
└── js/
    ├── config.js            ⚠️ EDITE AQUI com suas credenciais
    ├── supabase.js          Cliente Supabase (não edite)
    ├── state.js             Cache em memória (não edite)
    ├── utils.js             Funções auxiliares (não edite)
    ├── app.js               Lógica principal (não edite)
    ├── produtos.api.js      API produtos (não edite)
    ├── pedidos.api.js       API pedidos (não edite)
    ├── entradas.api.js      API entradas (não edite)
    ├── movimentacoes.api.js API movimentações (não edite)
    └── migrar.js            Migração localStorage→Supabase (não edite)
```

---

## 🚀 Próximos passos

- [ ] Domínio próprio (em vez de `vercel.app`)
- [ ] Autenticação multi-usuário
- [ ] Backup automático
- [ ] Service Worker (offline total)
- [ ] Notificações push
- [ ] Gráficos de vendas

---

## 📞 Suporte

Qualquer dúvida sobre:
- **Supabase:** https://supabase.com/docs
- **Vercel:** https://vercel.com/docs
- **Netlify:** https://docs.netlify.com

---

## 📄 Licença

Uso livre para seu negócio. Se clonar em outro repo, credite.

---

**Desenvolvido para DortaPods — Controle de Estoque & Vendas** 🍃
