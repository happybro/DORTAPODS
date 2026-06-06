// ══════════════════════════════════════════════════════════════════
// API WRAPPER - FIREBASE FIRESTORE
// ══════════════════════════════════════════════════════════════════

import {
  db,
  auth
} from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

class FirebaseAPI {
  constructor() {
    this.db = db;
    this.auth = auth;
  }

  // ──────────────────────────────────────────────────────────────
  // PRODUTOS
  // ──────────────────────────────────────────────────────────────

  async criarProduto(dados) {
    try {
      const docRef = await addDoc(collection(this.db, "produtos"), {
        nome: dados.nome,
        sabor: dados.sabor,
        compra: dados.compra,
        venda: dados.venda,
        estoque: dados.estoque || 0,
        criado: new Date()
      });
      console.log('[Firebase] ✓ Produto criado:', docRef.id);
      return { id: docRef.id, ...dados };
    } catch (e) {
      console.error('[Firebase] Erro ao criar produto:', e);
      throw e;
    }
  }

  async obterProdutos() {
    try {
      const q = query(collection(this.db, "produtos"), orderBy("nome"));
      const docs = await getDocs(q);
      const produtos = {};
      docs.forEach(doc => {
        produtos[doc.id] = { id: doc.id, ...doc.data() };
      });
      console.log('[Firebase] ✓ Carregados', Object.keys(produtos).length, 'produtos');
      return produtos;
    } catch (e) {
      console.error('[Firebase] Erro ao obter produtos:', e);
      throw e;
    }
  }

  async atualizarProduto(id, dados) {
    try {
      await updateDoc(doc(this.db, "produtos", id), {
        ...dados,
        atualizado: new Date()
      });
      console.log('[Firebase] ✓ Produto atualizado:', id);
    } catch (e) {
      console.error('[Firebase] Erro ao atualizar produto:', e);
      throw e;
    }
  }

  async deletarProduto(id) {
    try {
      await deleteDoc(doc(this.db, "produtos", id));
      console.log('[Firebase] ✓ Produto deletado:', id);
    } catch (e) {
      console.error('[Firebase] Erro ao deletar produto:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // PEDIDOS
  // ──────────────────────────────────────────────────────────────

  async criarPedido(dados) {
    try {
      const docRef = await addDoc(collection(this.db, "pedidos"), {
        cliente: dados.cliente,
        obs: dados.obs || "",
        status: dados.status || "pendente",
        total: dados.total || 0,
        lucro: dados.lucro || 0,
        itens: dados.itens || [],
        criado: new Date()
      });
      console.log('[Firebase] ✓ Pedido criado:', docRef.id);
      return { id: docRef.id, ...dados };
    } catch (e) {
      console.error('[Firebase] Erro ao criar pedido:', e);
      throw e;
    }
  }

  async obterPedidos() {
    try {
      const q = query(collection(this.db, "pedidos"), orderBy("criado", "desc"));
      const docs = await getDocs(q);
      const pedidos = {};
      docs.forEach(doc => {
        pedidos[doc.id] = { id: doc.id, ...doc.data() };
      });
      return pedidos;
    } catch (e) {
      console.error('[Firebase] Erro ao obter pedidos:', e);
      throw e;
    }
  }

  async atualizarPedido(id, dados) {
    try {
      await updateDoc(doc(this.db, "pedidos", id), {
        ...dados,
        atualizado: new Date()
      });
      console.log('[Firebase] ✓ Pedido atualizado:', id);
    } catch (e) {
      console.error('[Firebase] Erro ao atualizar pedido:', e);
      throw e;
    }
  }

  async deletarPedido(id) {
    try {
      await deleteDoc(doc(this.db, "pedidos", id));
      console.log('[Firebase] ✓ Pedido deletado:', id);
    } catch (e) {
      console.error('[Firebase] Erro ao deletar pedido:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // ENTRADAS
  // ──────────────────────────────────────────────────────────────

  async criarEntrada(dados) {
    try {
      const docRef = await addDoc(collection(this.db, "entradas"), {
        prodId: dados.prodId,
        qtd: dados.qtd,
        valor_compra: dados.valor_compra || 0,
        criado: new Date()
      });
      console.log('[Firebase] ✓ Entrada criada:', docRef.id);
      return { id: docRef.id, ...dados };
    } catch (e) {
      console.error('[Firebase] Erro ao criar entrada:', e);
      throw e;
    }
  }

  async obterEntradas() {
    try {
      const q = query(collection(this.db, "entradas"), orderBy("criado", "desc"));
      const docs = await getDocs(q);
      const entradas = {};
      docs.forEach(doc => {
        entradas[doc.id] = { id: doc.id, ...doc.data() };
      });
      return entradas;
    } catch (e) {
      console.error('[Firebase] Erro ao obter entradas:', e);
      throw e;
    }
  }

  async deletarEntrada(id) {
    try {
      await deleteDoc(doc(this.db, "entradas", id));
      console.log('[Firebase] ✓ Entrada deletada:', id);
    } catch (e) {
      console.error('[Firebase] Erro ao deletar entrada:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // MOVIMENTAÇÕES
  // ──────────────────────────────────────────────────────────────

  async criarMovimentacao(dados) {
    try {
      const docRef = await addDoc(collection(this.db, "movimentacoes"), {
        prodId: dados.prodId,
        delta: dados.delta,
        tipo: dados.tipo,
        referencia: dados.referencia || "",
        criado: new Date()
      });
      console.log('[Firebase] ✓ Movimentação criada:', docRef.id);
      return { id: docRef.id, ...dados };
    } catch (e) {
      console.error('[Firebase] Erro ao criar movimentação:', e);
      throw e;
    }
  }

  async obterMovimentacoes() {
    try {
      const q = query(collection(this.db, "movimentacoes"), orderBy("criado", "desc"));
      const docs = await getDocs(q);
      const movs = {};
      docs.forEach(doc => {
        movs[doc.id] = { id: doc.id, ...doc.data() };
      });
      return movs;
    } catch (e) {
      console.error('[Firebase] Erro ao obter movimentações:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // UTILITÁRIOS
  // ──────────────────────────────────────────────────────────────

  async limparTodosDados() {
    try {
      console.warn('[Firebase] LIMPANDO TODOS OS DADOS...');

      const coleções = ['movimentacoes', 'entradas', 'pedidos', 'produtos'];

      for (const colName of coleções) {
        const docs = await getDocs(collection(this.db, colName));
        for (const docSnap of docs) {
          await deleteDoc(doc(this.db, colName, docSnap.id));
        }
        console.log(`[Firebase] ✓ Limpa coleção: ${colName}`);
      }

      console.log('[Firebase] ✓ TODOS OS DADOS FORAM DELETADOS');
    } catch (e) {
      console.error('[Firebase] Erro ao limpar dados:', e);
      throw e;
    }
  }

  async exportarDados() {
    try {
      const dados = {
        produtos: await getDocs(collection(this.db, "produtos")),
        pedidos: await getDocs(collection(this.db, "pedidos")),
        entradas: await getDocs(collection(this.db, "entradas")),
        movimentacoes: await getDocs(collection(this.db, "movimentacoes")),
        exportedAt: new Date().toISOString()
      };

      const json = JSON.stringify(dados, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dortapods_backup_${Date.now()}.json`;
      a.click();

      console.log('[Firebase] ✓ Dados exportados');
      return dados;
    } catch (e) {
      console.error('[Firebase] Erro ao exportar dados:', e);
      throw e;
    }
  }

  // Listener para sincronização realtime
  onProdutosChange(callback) {
    const q = query(collection(this.db, "produtos"));
    return onSnapshot(q, (snapshot) => {
      const produtos = {};
      snapshot.forEach(doc => {
        produtos[doc.id] = { id: doc.id, ...doc.data() };
      });
      callback(produtos);
    });
  }
}

// Criar instância global
window.fbapi = new FirebaseAPI();

console.log('[Firebase.api] ✓ API Carregada!');
