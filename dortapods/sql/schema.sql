-- ================================================================
-- PodManager — Schema Supabase
-- Execute no SQL Editor do painel Supabase (supabase.com/dashboard)
-- ================================================================

-- ── PRODUTOS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id           TEXT        PRIMARY KEY,
  nome         TEXT        NOT NULL,
  sabor        TEXT        NOT NULL,
  compra       NUMERIC(10,2) NOT NULL DEFAULT 0,
  venda        NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque      INTEGER     NOT NULL DEFAULT 0,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ENTRADAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entradas (
  id        TEXT        PRIMARY KEY,
  prod_id   TEXT        NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome      TEXT        NOT NULL,
  qtd       INTEGER     NOT NULL,
  custo     NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PEDIDOS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id            TEXT        PRIMARY KEY,
  cliente       TEXT        NOT NULL,
  obs           TEXT,
  status        TEXT        NOT NULL DEFAULT 'pendente'
                            CHECK (status IN ('pendente', 'finalizado')),
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  lucro         NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PEDIDO_ITENS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedido_itens (
  id         TEXT        PRIMARY KEY,
  pedido_id  TEXT        NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  prod_id    TEXT        NOT NULL REFERENCES produtos(id),
  nome       TEXT        NOT NULL,
  sabor      TEXT        NOT NULL,
  qtd        INTEGER     NOT NULL,
  venda      NUMERIC(10,2) NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── MOVIMENTACOES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimentacoes (
  id        TEXT        PRIMARY KEY,
  tipo      TEXT        NOT NULL CHECK (tipo IN ('entrada', 'saida', 'pedido')),
  descricao TEXT        NOT NULL,
  valor     TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ÍNDICES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entradas_prod_id       ON entradas(prod_id);
CREATE INDEX IF NOT EXISTS idx_entradas_criado        ON entradas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_status         ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_criado         ON pedidos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido_id ON pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_prod_id   ON pedido_itens(prod_id);
CREATE INDEX IF NOT EXISTS idx_movs_criado            ON movimentacoes(criado_em DESC);

-- ── TRIGGER: atualizar_em automático ────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── RPC: atualizar estoque de forma atômica ──────────────────────
-- Garante que o estoque nunca fique negativo no banco
CREATE OR REPLACE FUNCTION rpc_atualizar_estoque(p_id TEXT, delta INTEGER)
RETURNS produtos AS $$
DECLARE
  resultado produtos;
BEGIN
  UPDATE produtos
    SET estoque = estoque + delta
  WHERE id = p_id
  RETURNING * INTO resultado;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto não encontrado: %', p_id;
  END IF;

  IF resultado.estoque < 0 THEN
    RAISE EXCEPTION 'Estoque insuficiente para: % %', resultado.nome, resultado.sabor;
  END IF;

  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- ── RLS: Políticas de acesso ─────────────────────────────────────
-- Habilita RLS em todas as tabelas
ALTER TABLE produtos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE entradas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

-- Permite todas as operações para a chave anônima (app single-user sem auth)
CREATE POLICY "anon_all_produtos"      ON produtos      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_entradas"      ON entradas      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pedidos"       ON pedidos       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pedido_itens"  ON pedido_itens  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_movimentacoes" ON movimentacoes FOR ALL TO anon USING (true) WITH CHECK (true);
