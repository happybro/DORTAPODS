// ============================================================
// SCRIPT PARA LIMPAR A BASE DE DADOS DO DORTAPODS
// ============================================================
//
// COMO USAR:
// 1. Abra o app: https://dortapods.vercel.app/
// 2. Abra o Developer Tools (F12 ou Ctrl+Shift+I)
// 3. Vá para a aba "Console"
// 4. Cole TODO O CÓDIGO ABAIXO E PRESSIONE ENTER
// 5. Digite "SIM" quando pedir confirmação
//
// ============================================================

async function limparBancoDados() {
  console.log('%c🧹 LIMPADOR DE BANCO DE DADOS - DortaPods', 'font-size: 20px; color: red; font-weight: bold;');
  console.log('%c⚠️ AVISO: Todos os dados serão deletados permanentemente!', 'color: red; font-size: 14px;');

  const confirma = prompt('Digite "SIM" para confirmar a limpeza completa:');

  if (confirma !== 'SIM') {
    console.log('%c❌ Operação cancelada', 'color: orange; font-size: 14px;');
    return;
  }

  try {
    console.log('%c\n🗑️ Iniciando limpeza...', 'color: blue; font-size: 14px;');

    // Importar as APIs (essas funções já estão carregadas)
    // const { sb } = await import('./js/supabase.js');

    // Usar o Supabase que já está carregado na memória
    // Vou fazer via requests direto

    const SUPABASE_URL = 'https://tkkmmswpbkgthlemvrgq.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_6aDQoFeuc5UAZn_HZmX4Pw_lEYPOyTN';

    const headers = {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // 1. Deletar movimentações
    console.log('Deletando movimentações...');
    await fetch(`${SUPABASE_URL}/rest/v1/movimentacoes`, {
      method: 'DELETE',
      headers: headers
    });
    console.log('✅ Movimentações deletadas');

    // 2. Deletar pedido_itens
    console.log('Deletando itens de pedidos...');
    await fetch(`${SUPABASE_URL}/rest/v1/pedido_itens`, {
      method: 'DELETE',
      headers: headers
    });
    console.log('✅ Itens de pedidos deletados');

    // 3. Deletar pedidos
    console.log('Deletando pedidos...');
    await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
      method: 'DELETE',
      headers: headers
    });
    console.log('✅ Pedidos deletados');

    // 4. Deletar entradas
    console.log('Deletando entradas...');
    await fetch(`${SUPABASE_URL}/rest/v1/entradas`, {
      method: 'DELETE',
      headers: headers
    });
    console.log('✅ Entradas deletadas');

    // 5. Deletar produtos
    console.log('Deletando produtos...');
    await fetch(`${SUPABASE_URL}/rest/v1/produtos`, {
      method: 'DELETE',
      headers: headers
    });
    console.log('✅ Produtos deletados');

    console.log('%c\n✨✨✨ BASE DE DADOS ZERADA COM SUCESSO! ✨✨✨', 'color: green; font-size: 16px; font-weight: bold;');
    console.log('%c\nRecarregando o app em 3 segundos...', 'color: green; font-size: 14px;');

    setTimeout(() => {
      location.reload();
    }, 3000);

  } catch (erro) {
    console.error('%c❌ ERRO ao limpar banco:', 'color: red; font-weight: bold;', erro);
    console.log('%c\n💡 Se o erro continuar, use o método manual no Supabase Dashboard:', 'color: blue;');
    console.log('https://app.supabase.com → SQL Editor → cole os comandos');
  }
}

// Executar a função
limparBancoDados();
