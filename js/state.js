// Cache em memória — espelho do banco, atualizado após cada operação
export const state = {
  prods:   {},  // { [id]: { id, nome, sabor, compra, venda, estoque, criado } }
  pedidos: [],  // [{ id, cliente, obs, status, itens:[], total, lucro, ts }]
  entradas:[],  // [{ id, prodId, nome, qtd, custo, ts }]
  movs:    [],  // [{ id, tipo, desc, val, ts }]
};
