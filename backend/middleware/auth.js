import { supabaseAdmin } from '../database/supabase.js';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verifica o token com Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Busca o perfil do usuário
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      return res.status(401).json({ error: 'Perfil de usuário não encontrado' });
    }

    if (!perfil.ativo) {
      return res.status(403).json({ error: 'Usuário desativado' });
    }

    req.user = { ...user, ...perfil };
    next();
  } catch (err) {
    console.error('Erro no middleware de auth:', err);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
}

export function requireGerente(req, res, next) {
  if (!req.user || !['gerente', 'admin'].includes(req.user.perfil)) {
    return res.status(403).json({ error: 'Acesso restrito a gerentes' });
  }
  next();
}
