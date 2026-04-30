import express from 'express';
import { supabaseAdmin } from '../database/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { buscarLeads } from '../services/googlePlaces.js';
import { scrapeGoogleMaps } from '../services/scraper.js';

const router = express.Router();

// POST /api/busca — realiza busca (Google API ou Scraper Gratuito)
router.post('/', authMiddleware, async (req, res) => {
  const { cidade, tipo, queryGoogle, maxResultados = 50 } = req.body;

  if (!cidade || !tipo) {
    return res.status(400).json({ error: 'Cidade e tipo são obrigatórios' });
  }

  try {
    const MAX_FIXO = 100;
    let leads;

    // Se tiver a chave do Google, usa a API oficial. Se não, usa o Scraper Gratuito.
    if (process.env.GOOGLE_PLACES_API_KEY) {
      console.log('Using Google Places API');
      const result = await buscarLeads({
        cidade,
        tipo,
        queryGoogle,
        maxResultados: MAX_FIXO,
      });
      leads = result.leads;
    } else {
      // Busca nomes de leads já salvos para este tipo/cidade para instruir o robô a buscar novos
      const { data: leadsExistentes } = await supabaseAdmin
        .from('leads')
        .select('nome, place_id')
        .eq('usuario_id', req.user.id)
        .eq('tipo_buscado', tipo)
        .ilike('cidade', `%${cidade.split(',')[0].trim()}%`);

      const nomesParaIgnorar = (leadsExistentes || []).map(l => l.nome);
      const idsParaIgnorar = (leadsExistentes || []).map(l => l.place_id).filter(Boolean);

    console.log(`Using Free Scraper (Puppeteer) - Ignorando ${nomesParaIgnorar.length} conhecidos`);
    leads = await scrapeGoogleMaps({
      cidade,
      tipo,
      queryGoogle,
      maxResultados: MAX_FIXO,
      ignorarNomes: nomesParaIgnorar,
      ignorarIds: idsParaIgnorar
    });
    }

    // REGRA DE OURO: Salvar automaticamente novos leads no banco (Upsert em massa)
    const leadsSalvar = leads.map(lead => ({
      place_id: lead.place_id || null,
      nome: lead.nome,
      endereco: lead.endereco || '',
      telefone: lead.telefone || '',
      whatsapp: lead.whatsapp || '',
      site: lead.site || '',
      email: lead.email || '',
      avaliacao: lead.avaliacao || 0,
      num_avaliacoes: lead.num_avaliacoes || 0,
      horario_funcionamento: lead.horario_funcionamento || '',
      aberto_agora: lead.aberto_agora || false,
      categoria: lead.categoria || '',
      cidade: lead.cidade,
      tipo_buscado: tipo,
      maps_url: lead.maps_url || '',
      latitude: lead.latitude || null,
      longitude: lead.longitude || null,
      status: 'Novo',
      usuario_id: req.user.id,
      data_prospeccao: new Date(),
      data_atualizacao: new Date()
    }));

    let novosAdicionados = 0;
    if (leadsSalvar.length > 0) {
      // Usamos upsert com ignoreDuplicates para ser ultra performático
      const { data: salvos, error: upsertError } = await supabaseAdmin
        .from('leads')
        .upsert(leadsSalvar, { 
          onConflict: 'place_id', 
          ignoreDuplicates: true 
        })
        .select('id');

      if (upsertError) {
        console.error('Erro no salvamento em massa:', upsertError.message);
      } else {
        novosAdicionados = salvos?.length || 0;
        console.log(`✅ ${novosAdicionados} leads processados com sucesso.`);
      }
    }

    // Registrar a busca no banco
    const { data: busca } = await supabaseAdmin
      .from('buscas')
      .insert({
        cidade,
        tipo_estabelecimento: tipo,
        max_resultados: MAX_FIXO,
        total_encontrado: leads.length,
        usuario_id: req.user.id,
      })
      .select()
      .single();

    // Calcula métricas para retornar e atualizar o frontend
    const { data: porStatus } = await supabaseAdmin
      .from('leads')
      .select('status')
      .eq('usuario_id', req.user.id);

    const statusMap = (porStatus || []).reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});

    const totalTotal = (porStatus || []).length;
    const contatosRealizados = (porStatus || []).filter(l => l.status !== 'Novo').length;

    return res.json({
      leads: leads,
      total: leads.length,
      novos: novosAdicionados,
      totalLeads: totalTotal,
      totalPotential: totalTotal,
      contatosRealizados,
      pendentes: totalTotal - contatosRealizados,
      porStatus: statusMap,
      busca_id: busca?.id,
    });
  } catch (err) {
    console.error('Erro na busca:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/busca/historico — histórico de buscas do usuário
router.get('/historico', authMiddleware, async (req, res) => {
  const { limit = 20 } = req.query;

  const { data, error } = await supabaseAdmin
    .from('buscas')
    .select('*')
    .eq('usuario_id', req.user.id)
    .order('realizada_em', { ascending: false })
    .limit(parseInt(limit));

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
