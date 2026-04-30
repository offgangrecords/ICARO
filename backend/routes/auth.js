import express from 'express';
import { supabaseAdmin } from '../database/supabase.js';
import { authMiddleware, requireGerente } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Buscar perfil
    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!perfil?.ativo) {
      return res.status(403).json({ error: 'Usuário desativado' });
    }

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      usuario: {
        id: perfil.id,
        nome: perfil.nome,
        email: perfil.email,
        perfil: perfil.perfil,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await supabaseAdmin.auth.admin.signOut(req.user.id);
    return res.json({ mensagem: 'Logout realizado com sucesso' });
  } catch {
    return res.json({ mensagem: 'Logout realizado' });
  }
});

// GET /api/auth/me — retorna dados do usuário autenticado
router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    id: req.user.id,
    nome: req.user.nome,
    email: req.user.email,
    perfil: req.user.perfil,
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token necessário' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Token de renovação inválido' });

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao renovar sessão' });
  }
});

export default router;
