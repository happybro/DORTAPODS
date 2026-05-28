# Guia Completo: PodManager + Supabase na Web

## O que você precisa fazer

1. **Criar banco de dados grátis (Supabase)**
2. **Configurar o código com as credenciais**
3. **Colocar o site online (Vercel ou Netlify)**

---

## PASSO 1: Criar Supabase (banco de dados grátis)

### 1.1 - Entrar no Supabase

- Vá para: https://supabase.com
- Clique em **"Sign Up"** (canto superior direito)
- Crie conta com:
  - Email
  - Senha
  - Ou login com GitHub (mais rápido)

### 1.2 - Criar novo projeto

- Após login, clique em **"New Project"**
- Preencha:
  - **Project Name:** `podmanager` (ou outro nome que queira)
  - **Database Password:** qualquer senha (anote em lugar seguro)
  - **Region:** escolha a mais próxima do Brasil (São Paulo se tiver)
- Clique em **"Create new project"**
- **Aguarde 2-3 minutos** (está criando o banco)

### 1.3 - Copiar as credenciais

Após o banco ser criado:

1. No menu esquerdo, clique em **"Settings"**
2. Clique em **"API"**
3. Você verá:
   - **Project URL** (algo como: `https://xxxxxxxxxxxxx.supabase.co`)
   - **Anon public key** (uma string longa com letras e números)

**Copie e guarde esses dois valores** — você vai usar em 5 minutos.

### 1.4 - Criar as tabelas do banco

1. No menu esquerdo, clique em **"SQL Editor"**
2. Clique em **"New Query"**
3. **Cole TODO o conteúdo do arquivo `sql/schema.sql`**
   - Este arquivo está em: `C:\Users\happy\OneDrive\Documentos\dortapods\sql\schema.sql`
4. Clique no botão **"Run"** (canto inferior direito)
5. Espere alguns segundos — se aparecer ✓, funcionou!

Pronto, o banco está criado e configurado.

---

## PASSO 2: Configurar o código

### 2.1 - Abrir o arquivo de configuração

- Abra o arquivo: `js/config.js`
- Ele começa assim:

```javascript
export const SUPABASE_URL      = 'https://SEU_PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

### 2.2 - Substituir pelos seus valores

Copie as 2 strings que pegou no Passo 1 e substitua:

**ANTES:**
```javascript
export const SUPABASE_URL      = 'https://SEU_PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

**DEPOIS (exemplo — use seus valores):**
```javascript
export const SUPABASE_URL      = 'https://abcdefghijk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

Salve o arquivo (Ctrl+S).

Pronto! Seu código está configurado.

---

## PASSO 3: Colocar na web (ESCOLHA UM)

### OPÇÃO A: Vercel (recomendado — muito fácil)

#### A.1 - Criar conta no Vercel

- Vá para: https://vercel.com
- Clique em **"Sign Up"**
- Faça login com **GitHub** (mais rápido) ou crie conta com email

#### A.2 - Fazer upload do projeto

1. Na página inicial do Vercel, clique em **"Add New"** → **"Project"**
2. Você verá opções:
   - Se souber usar Git: clique em **"Import Git Repository"** (mais fácil depois)
   - Se não souber: clique em **"File Upload"** ou **"Deploy Manually"**

**Opção simples (sem Git):**
1. Clique em **"Deploy Manually"**
2. Arraste a pasta `dortapods` inteira ou faça upload dos arquivos
3. Clique em **"Deploy"**
4. Espere alguns segundos
5. Pronto! Você receberá um link como: `https://podmanager-abc123.vercel.app`

Acesse esse link no celular ou computador — seu app está na web!

---

### OPÇÃO B: Netlify (também grátis e fácil)

#### B.1 - Criar conta no Netlify

- Vá para: https://netlify.com
- Clique em **"Sign up"**
- Crie conta com email ou GitHub

#### B.2 - Fazer upload

1. Na página inicial, você verá **"Drag and drop your site folder"**
2. Arraste a pasta `dortapods` inteira para a área indicada
3. Espere alguns segundos
4. Pronto! Você receberá um link como: `https://podmanager-xyz.netlify.app`

Acesse no celular — seu app está online!

---

## PASSO 4: Testar no smartphone

1. Pegue o link que recebeu (Vercel ou Netlify)
2. Compartilhe com seu celular (WhatsApp, email, etc.)
3. Abra no navegador do celular
4. Clique no botão de compartilhamento e escolha **"Adicionar à tela inicial"** (Android) ou **"Adicionar ao início"** (iOS)
5. Pronto! Seu app fica como um ícone na tela inicial

---

## Como usar agora

### Na primeira abertura:

1. O app vai detectar dados no localStorage (se tiver os antigos)
2. Vai migrar tudo automaticamente para Supabase
3. Limpa o localStorage (seguro)
4. Pronto para usar!

### Depois disso:

- Todos os dados são salvos em Supabase (na nuvem)
- Funciona offline parcialmente (cache)
- Sincroniza quando volta a conexão
- Funciona em qualquer dispositivo

---

## Checklist Final

- [ ] Criei conta no Supabase
- [ ] Criei novo projeto no Supabase
- [ ] Copiei Project URL e Anon Key
- [ ] Executei o SQL do `schema.sql` no Supabase
- [ ] Preenchei `js/config.js` com os valores
- [ ] Subi para Vercel ou Netlify
- [ ] Testei no celular
- [ ] Adicionei à tela inicial

---

## Se der erro...

### "Erro de autenticação — revise config.js"
- A chave ou URL está errada
- Volte e copie novamente do Supabase

### "Sem conexão com internet"
- Você está offline? O app funciona parcialmente no cache
- Verifica se a URL do Vercel/Netlify está correta

### "Tabelas não existem"
- O SQL não foi executado
- Volta no Supabase → SQL Editor
- Cola o `schema.sql` de novo

---

## Próximos passos opcionais

- [ ] Configurar domínio próprio (em vez de `vercel.app`)
- [ ] Backup automático dos dados
- [ ] Adicionar autenticação (para múltiplos usuários)
- [ ] Melhorar offline (Service Worker)

**Mas por enquanto, você tem um app funcional na web!** 🚀
