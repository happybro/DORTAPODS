# 🔥 Firebase Setup - 2 Minutos

## O Que Você Vai Fazer:

1. **Criar projeto Firebase** (1 minuto)
2. **Copiar credenciais** (30 segundos)
3. **Colar no arquivo** (30 segundos)
4. **Pronto!** Tudo funciona

---

## ✅ Passo 1: Criar Projeto Firebase

1. Abra: **https://console.firebase.google.com**
2. Clique em **"Criar projeto"** ou **"Create project"**
3. Nome: `dortapods` (ou o que quiser)
4. Desabilitar Google Analytics (opcional)
5. Clique **"Criar"**
6. Aguarde 1 minuto

---

## ✅ Passo 2: Ativar Firestore

1. No painel esquerdo, clique em **"Firestore Database"**
2. Clique **"Criar banco de dados"**
3. Modo: **"Modo de testes"** (para começar rápido)
4. Localização: **Deixar padrão**
5. Clique **"Criar"**

---

## ✅ Passo 3: Ativar Autenticação

1. No painel esquerdo, clique em **"Authentication"**
2. Clique **"Começar"** ou **"Get started"**
3. Vá para aba **"Sign-in method"**
4. Ative **"Anonymous"** (anônimo)
5. Clique **"Salvar"**

---

## ✅ Passo 4: Copiar Credenciais

1. Clique no ícone de engrenagem ⚙️ → **"Configurações do projeto"**
2. Role para baixo até **"Seus apps"**
3. Clique em **"Web"** ou **"</>"**
4. Copie o objeto `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy... copiar...",
  authDomain: "dortapods-abc.firebaseapp.com",
  projectId: "dortapods-abc",
  storageBucket: "dortapods-abc.appspot.com",
  messagingSenderId: "123456789...",
  appId: "1:123456789:web:abc...",
  measurementId: "G-ABC..."
};
```

---

## ✅ Passo 5: Colar nas Credenciais

1. Abra: `js/firebase-config.js` (no seu editor)
2. Procure por: `const firebaseConfig = {`
3. Substitua TODA a constante `firebaseConfig` pelas credenciais que copiou
4. **Salve o arquivo**
5. Faça commit e push:

```bash
git add js/firebase-config.js
git commit -m "Adicionar credenciais Firebase reais"
git push origin main
```

---

## ✅ Vercel Deploy Automático

Quando você faz push no GitHub:
1. Vercel detects mudança
2. Build automático
3. Deploy automático
4. Seu app fica online em ~2 minutos

---

## ✅ Pronto!

Acesse seu app online:
- URL: `https://seu-dominio-vercel.com`

Tudo funciona:
✅ Cadastrar produtos
✅ Registrar entrada
✅ Criar pedidos
✅ Ver histórico
✅ Sincronizar entre celulares
✅ Funciona offline
✅ Grátis para sempre

---

## 🔒 Segurança

Firebase está configurado no **"Modo de testes"** = qualquer um pode ler/escrever.

**Para produção, atualize as regras em Firestore:**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ❓ Dúvidas?

**P: Pode realmente ser grátis para sempre?**
R: Sim! Plano Spark (grátis) do Firebase é vitalício. Só tem limite se exceder (1GB dados, 50k ops/dia). Para 1 pessoa usando = nunca vai exceder.

**P: Os dados são meus?**
R: Sim! No seu projeto Firebase. Você tem acesso total.

**P: Posso mudar depois?**
R: Sim! Quando quiser, cria novo projeto e atualiza as credenciais.

---

**Bora lá! 2 minutos e tá tudo pronto!** 🚀
