# 🚀 Setup Pocketbase para DortaPods

## Opção 1: Deploy Automático em Render (RECOMENDADO - Grátis e Fácil)

### Passo 1: Criar Conta no Render
1. Ir para: https://render.com
2. Clicar em "Sign Up"
3. Fazer login com GitHub (ou email)
4. Confirmar email

### Passo 2: Conectar Repositório GitHub
1. Ir para Dashboard do Render
2. Clicar em "New" → "Web Service"
3. Clicar em "Connect a repository"
4. Selecionar: **happybro/DORTAPODS**
5. Clicar "Connect"

### Passo 3: Configurar o Serviço
1. **Name:** `dortapods-pocketbase`
2. **Environment:** Docker
3. **Region:** Frankfurt (ou mais próximo de você)
4. **Plan:** Free
5. Clicar em "Create Web Service"

⏳ **Aguarde 3-5 minutos** enquanto o Render faz o build

### Passo 4: Obter URL do Pocketbase
Após terminar, você verá uma URL tipo:
```
https://dortapods-pocketbase.onrender.com
```

**Salve essa URL!** 💾

### Passo 5: Acessar Admin do Pocketbase
1. Abra: `https://dortapods-pocketbase.onrender.com/_/`
2. Clique em "Create your first admin account"
3. Preencha:
   - Email: seu@email.com
   - Senha: uma senha segura
4. Clique "Create admin"

✅ **Pronto!** Pocketbase está rodando na nuvem grátis!

---

## Opção 2: Rodar Localmente (Desenvolvimento)

### Passo 1: Baixar Pocketbase
1. Ir para: https://github.com/pocketbase/pocketbase/releases
2. Baixar a versão para seu SO:
   - Windows: `pocketbase_*_windows_amd64.zip`
   - Mac: `pocketbase_*_darwin_amd64.zip`
   - Linux: `pocketbase_*_linux_amd64.zip`
3. Deszipar em pasta: `./pocketbase/`

### Passo 2: Rodar Pocketbase
```bash
cd pocketbase
./pocketbase serve  # ou pocketbase.exe serve (Windows)
```

Você verá:
```
Server started at http://127.0.0.1:8090
```

### Passo 3: Acessar Admin
Abra no navegador: http://localhost:8090/_/

---

## 📊 Criar Coleções no Pocketbase

Após fazer login no admin, você vai criar as coleções.

### 1. Coleção: PRODUTOS

**Clique em "Create collection"**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | Text | Sim | ID único (auto) |
| `nome` | Text | Sim | Nome do pod |
| `sabor` | Text | Sim | Sabor/variedade |
| `compra` | Number | Sim | Preço de compra |
| `venda` | Number | Sim | Preço de venda |
| `estoque` | Number | Sim | Quantidade em estoque |
| `created` | DateTime | Auto | Data de criação |
| `updated` | DateTime | Auto | Data de atualização |

### 2. Coleção: PEDIDOS

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `id` | Text | Sim |
| `cliente` | Text | Sim |
| `obs` | Text | Não |
| `status` | Select (pendente/finalizado) | Sim |
| `total` | Number | Sim |
| `lucro` | Number | Sim |
| `itens` | JSON | Sim |
| `created` | DateTime | Auto |
| `updated` | DateTime | Auto |

**Campo `itens` exemplo:**
```json
[
  {"prodId": "abc123", "nome": "V150 Pro", "sabor": "Blue", "qtd": 2, "venda": 30},
  {"prodId": "def456", "nome": "V150 Pro", "sabor": "Red", "qtd": 1, "venda": 28}
]
```

### 3. Coleção: ENTRADAS

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `id` | Text | Sim |
| `prodId` | Text | Sim |
| `qtd` | Number | Sim |
| `valor_compra` | Number | Sim |
| `created` | DateTime | Auto |
| `updated` | DateTime | Auto |

### 4. Coleção: MOVIMENTACOES

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| `id` | Text | Sim |
| `prodId` | Text | Sim |
| `delta` | Number | Sim |
| `tipo` | Select (entrada/saida) | Sim |
| `referencia` | Text | Não |
| `created` | DateTime | Auto |
| `updated` | DateTime | Auto |

---

## 🔐 Configurar Segurança

### No Admin do Pocketbase:

1. Clique em cada coleção
2. Vá para aba "API Rules"
3. Defina:

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

(Isso permite que usuarios autenticados (anônimos) acessem)

---

## 🎯 Próximos Passos

Após criar as coleções:

1. ✅ Passe a URL do Pocketbase para Claude
   - Exemplo: `https://dortapods-pocketbase.onrender.com`
2. ✅ Claude adapta o código para usar Pocketbase
3. ✅ Testamos tudo
4. ✅ Você faz deploy da Vercel
5. ✅ Pronto! 🎉

---

## 💡 Dicas

- **Dados persistem?** Sim! No Render ficam salvos na nuvem
- **Quanto custa?** Grátis! Render oferece 750 horas/mês (suficiente para sempre rodar)
- **Limite de dados?** Nenhum! Quanto quiser
- **URL muda?** Não, é permanente enquanto o serviço existe
- **Posso acessar dados?** Sim, interface admin sempre disponível

---

## ❓ Dúvidas Comuns

**P: E se o serviço cair?**
R: Render é confiável (99.9% uptime). Se cair, eles reiniciam automaticamente.

**P: Vou perder os dados?**
R: Não! Estão na nuvem, salvo e seguro.

**P: Posso usar em múltiplos celulares?**
R: Sim! Todos acessam a mesma URL, os dados sincronizam.

**P: Como faço backup?**
R: Pocketbase tem backup automático. Você pode fazer export no admin.

---

**Bora começar? 🚀**

Qual opção você escolhe?
- [ ] Render (nuvem, automático, recomendado)
- [ ] Local (seu PC)
