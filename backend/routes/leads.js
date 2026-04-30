import express from 'express';
import { supabaseAdmin } from '../database/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { gerarCSV, gerarExcel } from '../services/exportacao.js';
import { gerarCSV, gerarExcel } from '../services/exportacao.js';

const router = express.Router();

// GET /api/leads — lista leads com filtros
router.get('/', authMiddleware, async (req, res) => {
  const {
    page = 1, limit = 50,
    status, cidade, tipo,
    busca: buscaTxt, usuario_id,
    data_inicio, data_fim,
    ordem = 'data_prospeccao', direcao = 'desc',
  } = req.query;

  let query = supabaseAdmin
    .from('leads')
    .select('*, usuarios(nome)', { count: 'exact' });

  // Gerente vê todos; vendedor vê apenas os seus
  if (req.user.perfil === 'vendedor') {
    query = query.eq('usuario_id', req.user.id);
  } else if (usuario_id) {
    query = query.eq('usuario_id', usuario_id);
  }

  if (status) query = query.eq('status', status);
  if (cidade) query = query.ilike('cidade', `%${cidade}%`);
  if (tipo) query = query.eq('tipo_buscado', tipo);
  if (buscaTxt) query = query.ilike('nome', `%${buscaTxt}%`);
  if (data_inicio) query = query.gte('data_prospeccao', data_inicio);
  if (data_fim) query = query.lte('data_prospeccao', data_fim);

  const from = (parseInt(page) - 1) * parseInt(limit);
  const to = from + parseInt(limit) - 1;

  query = query
    .order(ordem, { ascending: direcao === 'asc' })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    leads: data,
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / parseInt(limit)),
  });
});

// POST /api/leads — salvar leads na base
router.post('/', authMiddleware, async (req, res) => {
  const { leads, busca_id } = req.body;

  if (!leads || !Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'Lista de leads é obrigatória' });
  }

  const leadsSalvar = leads.map(lead => ({
    place_id: lead.place_id || null,
    nome: lead.nome,
    endereco: lead.endereco,
    telefone: lead.telefone,
    whatsapp: lead.whatsapp,
    site: lead.site,
    email: lead.email,
    avaliacao: lead.avaliacao,
    num_avaliacoes: lead.num_avaliacoes,
    horario_funcionamento: lead.horario_funcionamento,
    aberto_agora: lead.aberto_agora,
    categoria: lead.categoria,
    cidade: lead.cidade,
    tipo_buscado: lead.tipo_buscado,
    maps_url: lead.maps_url,
    latitude: lead.latitude,
    longitude: lead.longitude,
    status: 'Novo',
    usuario_id: req.user.id,
    busca_id: busca_id || null,
  }));

  // Upsert para evitar duplicatas por place_id (usando a constraint recém criada)
  const { data, error } = await supabaseAdmin
    .from('leads')
    .upsert(leadsSalvar, { 
      onConflict: 'place_id', 
      ignoreDuplicates: true // Se já existe o ID, ignora para não sobrescrever status manual
    })
    .select();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    mensagem: `${data.length} lead(s) salvos com sucesso`,
    leads: data,
  });
});

// PATCH /api/leads/:id — atualizar status ou notas
router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status, notas } = req.body;

  const statusValidos = ['Novo', 'Contato realizado', 'Proposta enviada', 'Venda Realizada', 'Cliente', 'Sem interesse'];
  if (status && !statusValidos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido' });
  }

  const updates = {};
  if (status) updates.status = status;
  if (notas !== undefined) updates.notas = notas;

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// DELETE /api/leads/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ mensagem: 'Lead excluído com sucesso' });
});

// POST /api/leads/exportar/csv
router.post('/exportar/csv', authMiddleware, async (req, res) => {
  const { leads } = req.body;
  if (!leads?.length) return res.status(400).json({ error: 'Nenhum lead para exportar' });

  const csv = gerarCSV(leads);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="leads_icaro_${Date.now()}.csv"`);
  return res.send('\uFEFF' + csv); // BOM para Excel reconhecer UTF-8
});

// POST /api/leads/exportar/excel
router.post('/exportar/excel', authMiddleware, async (req, res) => {
  const { leads } = req.body;
  if (!leads?.length) return res.status(400).json({ error: 'Nenhum lead para exportar' });

  const buffer = gerarExcel(leads);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="leads_icaro_${Date.now()}.xlsx"`);
  return res.send(buffer);
});

export default router;
