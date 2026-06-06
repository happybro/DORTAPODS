// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FIREBASE - DORTAPODS (Versão Simplificada)
// ══════════════════════════════════════════════════════════════════

let db = null;
let auth = null;

// Carregar Firebase de forma não-bloqueante
(async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    const { getFirestore, enableIndexedDbPersistence } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");
    const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js");

    const firebaseConfig = {
      apiKey: "AIzaSyDkK6rxxsi1ik6aS9Qis-ruOaxtBIWmd74",
      authDomain: "dortapods.firebaseapp.com",
      projectId: "dortapods",
      storageBucket: "dortapods.firebasestorage.app",
      messagingSenderId: "268747810661",
      appId: "1:268747810661:web:f2d074319ed48b0bd0638c"
    };

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Habilitar persistência offline
    enableIndexedDbPersistence(db).catch(() => {});

    // Autenticar (em background, não bloqueia)
    signInAnonymously(auth).catch(() => {});

    console.log('[Firebase] ✓ Carregado com sucesso!');
  } catch (error) {
    console.warn('[Firebase] Erro ao carregar:', error.message);
  }
})();

// Exportar (podem estar undefined no início)
export { db, auth };
