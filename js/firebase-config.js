// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FIREBASE - DORTAPODS
// ══════════════════════════════════════════════════════════════════

let db = null;
let auth = null;
let firebaseReady = false;
const waiters = [];

// Notificar quando Firebase estiver pronto
function notifyReady() {
  firebaseReady = true;
  waiters.forEach(fn => fn());
  waiters.length = 0;
}

// Esperar Firebase estar pronto
export function waitForFirebase() {
  return new Promise(resolve => {
    if (firebaseReady) {
      resolve();
    } else {
      waiters.push(resolve);
    }
  });
}

// Carregar Firebase de forma rápida e confiável
(async () => {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js");
    const { getFirestore, enableIndexedDbPersistence } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

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

    // Habilitar persistência offline (non-blocking)
    enableIndexedDbPersistence(db).catch(() => {});

    console.log('[Firebase] ✓ Inicializado com sucesso!');
    notifyReady();
  } catch (error) {
    console.error('[Firebase] Erro crítico:', error);
    // Ainda assim marcar como pronto para o app não travar
    setTimeout(notifyReady, 1000);
  }
})();

// Exportar
export { db, auth };
