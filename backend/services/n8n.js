import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function enviarParaN8N({ vendedor, busca, leads }) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('URL do webhook N8N não configurada. Acesse Configurações para definir.');
  }

  const payload = {
    evento: 'novos_leads_prospectados',
    vendedor: {
      id: vendedor.id,
      nome: vendedor.nome,
      email: vendedor.email,
    },
    busca: {
      cidade: busca.cidade,
      tipo: busca.tipo,
      raio_km: busca.raio_km,
      data: new Date().toISOString(),
    },
    leads: leads.map(lead => ({
      place_id: lead.place_id,
      nome: lead.nome,
      endereco: lead.endereco,
      telefone: lead.telefone,
      whatsapp: lead.whatsapp,
      site: lead.site,
      email: lead.email || '',
      avaliacao: lead.avaliacao,
      num_avaliacoes: lead.num_avaliacoes,
      horario: lead.horario_funcionamento,
      aberto_agora: lead.aberto_agora,
      categoria: lead.categoria,
      maps_url: lead.maps_url,
    })),
    total_leads: leads.length,
  };

  const response = await axios.post(webhookUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });

  return { sucesso: true, status: response.status };
}
