// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FIREBASE - DORTAPODS
// ══════════════════════════════════════════════════════════════════
// Banco de dados grátis, vitalício, sem limite de crédito de tempo

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Configuração do Firebase (pública, é seguro)
const firebaseConfig = {
  apiKey: "AIzaSyDiN8K_V8pZkE1W2x3Y4Z5a6B7c8D9e0F1g",
  authDomain: "dortapods-app.firebaseapp.com",
  projectId: "dortapods-app",
  storageBucket: "dortapods-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcd",
  measurementId: "G-ABCDEFGHIJ"
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
