import express from 'express';
import { supabaseAdmin } from '../database/supabase.js';
import { authMiddleware, requireGerente } from '../middleware/auth.js';

const router = express.Router();

// GET /api/configuracoes — retorna todas as configurações (sem API Keys sensíveis para não-gerentes)
router.get('/', authMiddleware, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('configuracoes')
    .select('chave, valor, descricao');

  if (error) return res.status(500).json({ error: error.message });

  // Mascarar chaves sensíveis para vendedores
  const configuracoes = data.map(item => {
    if (req.user.perfil === 'vendedor' && item.chave === 'google_places_api_key') {
      return { ...item, valor: item.valor ? '••••••••••••' : '' };
    }
    return item;
  });

  return res.json(configuracoes);
});

// PATCH /api/configuracoes — atualiza uma ou mais configurações
router.patch('/', authMiddleware, requireGerente, async (req, res) => {
  const { configuracoes } = req.body;
  if (!Array.isArray(configuracoes)) {
    return res.status(400).json({ error: 'configuracoes deve ser um array' });
  }

  const updates = await Promise.all(
    configuracoes.map(({ chave, valor }) =>
      supabaseAdmin
        .from('configuracoes')
        .update({ valor, atualizado_em: new Date().toISOString() })
        .eq('chave', chave)
        .select()
    )
  );

  const erros = updates.filter(r => r.error);
  if (erros.length > 0) {
    return res.status(500).json({ error: 'Erro ao atualizar algumas configurações' });
  }

  return res.json({ mensagem: 'Configurações atualizadas com sucesso' });
});

// GET /api/configuracoes/tipos — tipos de estabelecimento
router.get('/tipos', authMiddleware, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tipos_estabelecimento')
    .select('*')
    .eq('ativo', true)
    .order('ordem');

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/configuracoes/tipos — adicionar tipo
router.post('/tipos', authMiddleware, requireGerente, async (req, res) => {
  const { nome, query_google } = req.body;
  if (!nome || !query_google) {
    return res.status(400).json({ error: 'nome e query_google são obrigatórios' });
  }

  const { data, error } = await supabaseAdmin
    .from('tipos_estabelecimento')
    .insert({ nome, query_google })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// DELETE /api/configuracoes/tipos/:id — remover tipo
router.delete('/tipos/:id', authMiddleware, requireGerente, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('tipos_estabelecimento')
    .update({ ativo: false })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ mensagem: 'Tipo removido com sucesso' });
});

// GET /api/configuracoes/usuarios — lista usuários (apenas gerentes)
router.get('/usuarios', authMiddleware, requireGerente, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, perfil, ativo, criado_em')
    .order('criado_em', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/configuracoes/usuarios — criar novo usuário
router.post('/usuarios', authMiddleware, requireGerente, async (req, res) => {
  const { nome, email, senha, perfil = 'vendedor' } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  try {
    // Cria o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, perfil },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }
      return res.status(500).json({ error: authError.message });
    }

    // O trigger do banco já cria o perfil automaticamente
    // Mas garantimos que o perfil está correto
    await supabaseAdmin
      .from('usuarios')
      .update({ nome, perfil })
      .eq('id', authData.user.id);

    const { data: usuario } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, perfil, ativo, criado_em')
      .eq('id', authData.user.id)
      .single();

    return res.status(201).json(usuario);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PATCH /api/configuracoes/usuarios/:id — atualizar usuário
router.patch('/usuarios/:id', authMiddleware, requireGerente, async (req, res) => {
  const { nome, perfil, ativo, senha } = req.body;
  const { id } = req.params;

  // Atualizar perfil na tabela
  if (nome || perfil !== undefined || ativo !== undefined) {
    const updates = {};
    if (nome) updates.nome = nome;
    if (perfil) updates.perfil = perfil;
    if (ativo !== undefined) updates.ativo = ativo;

    const { error } = await supabaseAdmin.from('usuarios').update(updates).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
  }

  // Atualizar senha se fornecida
  if (senha) {
    if (senha.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: senha });
    if (error) return res.status(500).json({ error: error.message });
  }

  return res.json({ mensagem: 'Usuário atualizado com sucesso' });
});

export default router;
