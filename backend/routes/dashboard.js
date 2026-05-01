import express from 'express';
import { supabaseAdmin } from '../database/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard — métricas gerais para o usuário
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const { count: totalLeads } = await supabaseAdmin
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', userId);

    const { data: porStatus } = await supabaseAdmin
      .from('leads')
      .select('status, cidade, tipo_buscado')
      .eq('usuario_id', userId);

    const statusMap = {
      'Novo': 0, 'Contato realizado': 0, 'Proposta enviada': 0,
      'Venda Realizada': 0, 'Cliente': 0, 'Sem interesse': 0
    };
    
    const cidadesAgrupadas = {};
    const categoriasAgrupadas = {};

    (porStatus || []).forEach(lead => {
      // 1. Contagem por status
      statusMap[lead.status] = (statusMap[lead.status] || 0) + 1;

      // 2. Agrupamento por cidade
      const cidadeNome = lead.cidade || 'Não informada';
      if (!cidadesAgrupadas[cidadeNome]) {
        cidadesAgrupadas[cidadeNome] = { cidade: cidadeNome, salvos: 0, total_encontrado: 100, categorias: [] };
      }
      cidadesAgrupadas[cidadeNome].salvos += 1;
      
      // 3. Agrupamento por categoria (Central do Vendedor)
      const catNome = lead.tipo_buscado || lead.categoria || 'Outros';
      if (!categoriasAgrupadas[catNome]) {
        categoriasAgrupadas[catNome] = { tipo: catNome, total: 0 };
      }
      categoriasAgrupadas[catNome].total += 1;

      const catExistente = cidadesAgrupadas[cidadeNome].categorias.find(c => c.tipo === catNome);
      if (catExistente) catExistente.total += 1;
      else cidadesAgrupadas[cidadeNome].categorias.push({ tipo: catNome, total: 1 });
    });

    const progressoCidades = Object.values(cidadesAgrupadas).map(c => ({
      ...c,
      percentual: Math.min(100, Math.round((c.salvos / 100) * 100))
    }));

    const analiseCategorias = Object.values(categoriasAgrupadas).sort((a, b) => b.total - a.total);

    const contatosRealizados = (porStatus || []).filter(l => l.status !== 'Novo').length;
    const totalLeadsSalvos = (porStatus || []).length;

    const regioesMapeamento = {
      'AC': 'Norte', 'AM': 'Norte', 'AP': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste',
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };

    const regioesAgrupadas = {
      'Norte': { nome: 'Norte', salvos: 0, total: 150 },
      'Nordeste': { nome: 'Nordeste', salvos: 0, total: 300 },
      'Centro-Oeste': { nome: 'Centro-Oeste', salvos: 0, total: 200 },
      'Sudeste': { nome: 'Sudeste', salvos: 0, total: 800 },
      'Sul': { nome: 'Sul', salvos: 0, total: 400 },
    };

    (porStatus || []).forEach(lead => {
      const uf = lead.cidade ? lead.cidade.split(',')[1]?.trim() : null;
      const regiao = uf ? regioesMapeamento[uf] : null;
      if (regiao) {
        regioesAgrupadas[regiao].salvos += 1;
      }
    });

    const progressoRegioes = Object.values(regioesAgrupadas).map(r => ({
      ...r,
      percentual: r.total > 0 ? Math.min(100, Math.round((r.salvos / r.total) * 100)) : 0
    })).sort((a, b) => b.salvos - a.salvos);

    return res.json({
      totalLeads: totalLeadsSalvos,
      totalPotential: totalLeadsSalvos,
      contatosRealizados,
      pendentes: totalLeadsSalvos - contatosRealizados,
      porStatus: statusMap,
      progressoCidades: progressoCidades.sort((a, b) => b.salvos - a.salvos),
      progressoRegioes: progressoRegioes,
      leadsNoMapa: [],
    });
  } catch (err) {
    console.error('Erro no dashboard:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/detalhes — lista leads de uma cidade ou região para o modal
router.get('/detalhes', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { cidade, regiao, tipo } = req.query;

  try {
    let query = supabaseAdmin
      .from('leads')
      .select('*')
      .eq('usuario_id', userId);

    if (tipo) {
      query = query.eq('tipo_buscado', tipo);
      const { data: leads, error } = await query.order('nome', { ascending: true });
      if (error) throw error;
      return res.json({ leads: leads || [] });
    }

    if (cidade) {
      const cidadeLimpa = cidade.split(',')[0].trim();
      query = query.ilike('cidade', `%${cidadeLimpa}%`);
      const { data: leads, error } = await query.order('nome', { ascending: true });
      if (error) throw error;
      return res.json({ leads: leads || [] });
    } else if (req.query.total === 'true') {
      const { data: leads, error } = await query.order('nome', { ascending: true });
      if (error) throw error;
      return res.json({ leads: leads || [] });
    } else if (regiao) {
      const estadosDaRegiao = {
        'Norte': ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
        'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
        'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
        'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
        'Sul': ['PR', 'RS', 'SC']
      }[regiao] || [];
      
      const { data: todosLeads, error } = await query;
      if (error) throw error;

      const leadsFiltrados = (todosLeads || []).filter(l => {
        const uf = l.cidade?.split(',')[1]?.trim();
        return estadosDaRegiao.includes(uf);
      });
      return res.json({ leads: leadsFiltrados });
    }

    return res.json({ leads: [] });
  } catch (err) {
    console.error('Erro ao buscar detalhes:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
