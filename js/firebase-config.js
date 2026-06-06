// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FIREBASE - DORTAPODS
// ══════════════════════════════════════════════════════════════════
// Banco de dados grátis, vitalício, sem limite de crédito de tempo

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Configuração do Firebase (pública, é seguro)
// ⚠️ IMPORTANTE: Atualize com suas credenciais reais do Firebase!
// Veja: FIREBASE-SETUP-RAPIDO.md para instruções (2 minutos)
// Estas são credenciais de exemplo/teste
const firebaseConfig = {
  apiKey: "AIzaSyDkK6rxxsi1ik6aS9Qis-ruOaxtBIWmd74",
  authDomain: "dortapods.firebaseapp.com",
  projectId: "dortapods",
  storageBucket: "dortapods.firebasestorage.app",
  messagingSenderId: "268747810661",
  appId: "1:268747810661:web:f2d074319ed48b0bd0638c"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

// Habilitar persistência offline
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('[Firebase] Múltiplas abas abertas');
  } else if (err.code === 'unimplemented') {
    console.log('[Firebase] Browser não suporta persistência');
  }
});

// Inicializar Auth
export const auth = getAuth(app);

// Autenticar anonimamente
signInAnonymously(auth)
  .then(() => {
    console.log('[Firebase] ✓ Autenticado anonimamente');
  })
  .catch((error) => {
    console.error('[Firebase] Erro ao autenticar:', error);
  });

console.log('[Firebase] ✓ Inicializado com sucesso!');
