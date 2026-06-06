// ══════════════════════════════════════════════════════════════════
// API WRAPPER - POCKETBASE
// ══════════════════════════════════════════════════════════════════
// Abstrai chamadas ao Pocketbase para facilitar integração

class PBApi {
  constructor(pbInstance) {
    this.pb = pbInstance;
  }

  // ──────────────────────────────────────────────────────────────
  // AUTENTICAÇÃO ANÔNIMA
  // ──────────────────────────────────────────────────────────────

  async autenticarAnonimo() {
    try {
      console.log('[PBApi] Autenticando anonimamente...');

      // Verificar se já está autenticado
      if (this.pb.authStore.isValid) {
        console.log('[PBApi] ✓ Já autenticado');
        return this.pb.authStore.record;
      }

      // Criar novo usuário anônimo
      const usuario = await this.pb.collection('usuarios').create({
        email: `anon_${Date.now()}@localhost`,
        password: `pwd_${Math.random().toString(36).substr(2, 9)}`,
        passwordConfirm: `pwd_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Cliente'
      });

      console.log('[PBApi] ✓ Usuário anônimo criado:', usuario.id);
      return usuario;
    } catch (e) {
      console.error('[PBApi] Erro ao autenticar:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // PRODUTOS
  // ──────────────────────────────────────────────────────────────

  async criarProduto(dados) {
    try {
      const record = await this.pb.collection('produtos').create({
        nome: dados.nome,
        sabor: dados.sabor,
        compra: dados.compra,
        venda: dados.venda,
        estoque: dados.estoque || 0
      });
      console.log('[PBApi] ✓ Produto criado:', record.id);
      return record;
    } catch (e) {
      console.error('[PBApi] Erro ao criar produto:', e);
      throw e;
    }
  }

  async obterProdutos() {
    try {
      const records = await this.pb.collection('produtos').getFullList({
        sort: '+nome,+sabor'
      });
      console.log('[PBApi] ✓ Carregados', records.length, 'produtos');
      return records;
    } catch (e) {
      console.error('[PBApi] Erro ao obter produtos:', e);
      throw e;
    }
  }

  async atualizarProduto(id, dados) {
    try {
      const record = await this.pb.collection('produtos').update(id, dados);
      console.log('[PBApi] ✓ Produto atualizado:', id);
      return record;
    } catch (e) {
      console.error('[PBApi] Erro ao atualizar produto:', e);
      throw e;
    }
  }

  async deletarProduto(id) {
    try {
      await this.pb.collection('produtos').delete(id);
      console.log('[PBApi] ✓ Produto deletado:', id);
    } catch (e) {
      console.error('[PBApi] Erro ao deletar produto:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // PEDIDOS
  // ──────────────────────────────────────────────────────────────

  async criarPedido(dados) {
    try {
      const record = await this.pb.collection('pedidos').create({
        cliente: dados.cliente,
        obs: dados.obs || '',
        status: 'pendente',
        total: dados.total || 0,
        lucro: dados.lucro || 0,
        itens: JSON.stringify(dados.itens || [])
      });
      console.log('[PBApi] ✓ Pedido criado:', record.id);
      return record;
    } catch (e) {
      console.error('[PBApi] Erro ao criar pedido:', e);
      throw e;
    }
  }

  async obterPedidos() {
    try {
      const records = await this.pb.collection('pedidos').getFullList({
        sort: '-created'
      });

      // Converter itens de JSON string para array
      return records.map(r => ({
        ...r,
        itens: typeof r.itens === 'string' ? JSON.parse(r.itens) : r.itens
      }));
    } catch (e) {
      console.error('[PBApi] Erro ao obter pedidos:', e);
      throw e;
    }
  }

  async atualizarPedido(id, dados) {
    try {
      const updateData = { ...dados };
      if (updateData.itens) {
        updateData.itens = JSON.stringify(updateData.itens);
      }

      const record = await this.pb.collection('pedidos').update(id, updateData);
      console.log('[PBApi] ✓ Pedido atualizado:', id);
      return record;
    } catch (e) {
      console.error('[PBApi] Erro ao atualizar pedido:', e);
      throw e;
    }
  }

  async deletarPedido(id) {
    try {
      await this.pb.collection('pedidos').delete(id);
      console.log('[PBApi] ✓ Pedido deletado:', id);
    } catch (e) {
      console.error('[PBApi] Erro ao deletar pedido:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // ENTRADAS DE ESTOQUE
  // ──────────────────────────────────────────────────────────────

  async criarEntrada(dados) {
    try {
      const record = await this.pb.collection('entradas').create({
        prodId: dados.prodId,
        qtd: dados.qtd,
        valor_compra: dados.valor_compra || 0
      });
      console.log('[PBApi] ✓ Entrada criada:', record.id);
      return record;
    } catch (e) {
      console.error('[PBApi] Erro ao criar entrada:', e);
      throw e;
    }
  }

  async obterEntradas() {
    try {
      const records = await this.pb.collection('entradas').getFullList({
        sort: '-created'
      });
      console.log('[PBApi] ✓ Carregadas', records.length, 'entradas');
      return records;
    } catch (e) {
      console.error('[PBApi] Erro ao obter entradas:', e);
      throw e;
    }
  }

  async deletarEntrada(id) {
    try {
      await this.pb.collection('entradas').delete(id);
      console.log('[PBApi] ✓ Entrada deletada:', id);
    } catch (e) {
      console.error('[PBApi] Erro ao deletar entrada:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // MOVIMENTAÇÕES (HISTÓRICO)
  // ──────────────────────────────────────────────────────────────

  async criarMovimentacao(dados) {
    try {
      const record = await this.pb.collection('movimentacoes').create({
        prodId: dados.prodId,
        delta: dados.delta,
        tipo: dados.tipo,
        referencia: dados.referencia || ''
      });
      console.log('[PBApi] ✓ Movimentação criada:', record.id);
      return record;
    } catch (e) {
      console.error('[PBApi] Erro ao criar movimentação:', e);
      throw e;
    }
  }

  async obterMovimentacoes() {
    try {
      const records = await this.pb.collection('movimentacoes').getFullList({
        sort: '-created'
      });
      return records;
    } catch (e) {
      console.error('[PBApi] Erro ao obter movimentações:', e);
      throw e;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // UTILITÁRIOS
  // ──────────────────────────────────────────────────────────────

  async limparTodosDados() {
    try {
      console.warn('[PBApi] LIMPANDO TODOS OS DADOS...');

      const coleções = ['movimentacoes', 'entradas', 'pedidos', 'produtos'];

      for (const col of coleções) {
        const records = await this.pb.collection(col).getFullList();
        for (const record of records) {
          await this.pb.collection(col).delete(record.id);
        }
        console.log(`[PBApi] ✓ Limpa coleção: ${col}`);
      }

      console.log('[PBApi] ✓ TODOS OS DADOS FORAM DELETADOS');
    } catch (e) {
      console.error('[PBApi] Erro ao limpar dados:', e);
      throw e;
    }
  }

  async exportarDados() {
    try {
      const dados = {
        produtos: await this.pb.collection('produtos').getFullList(),
        pedidos: await this.pb.collection('pedidos').getFullList(),
        entradas: await this.pb.collection('entradas').getFullList(),
        movimentacoes: await this.pb.collection('movimentacoes').getFullList(),
        exportedAt: new Date().toISOString()
      };

      // Converter para JSON e fazer download
      const json = JSON.stringify(dados, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dortapods_backup_${Date.now()}.json`;
      a.click();

      console.log('[PBApi] ✓ Dados exportados');
      return dados;
    } catch (e) {
      console.error('[PBApi] Erro ao exportar dados:', e);
      throw e;
    }
  }
}

// Criar instância global
const pbapi = new PBApi(pb);
