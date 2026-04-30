import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
dotenv.config();

const cache = new NodeCache({ stdTTL: 86400 }); // 24h default

const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const CATEGORIAS_PT = {
  'dentist': 'Dentista',
  'hospital': 'Hospital',
  'doctor': 'Médico / Clínica',
  'health': 'Saúde',
  'pharmacy': 'Farmácia',
  'physiotherapist': 'Fisioterapeuta',
  'veterinary_care': 'Veterinária',
  'laboratory': 'Laboratório',
  'medical_care': 'Cuidados Médicos',
  'store': 'Loja',
  'point_of_interest': 'Ponto de Interesse',
  'establishment': 'Estabelecimento',
};

function getCacheKey(cidade, tipo, raio) {
  return `${cidade}|${tipo}|${raio}`.toLowerCase().trim();
}

function traduzirCategoria(cat, defaultVal) {
  if (!cat) return defaultVal;
  const key = cat.toLowerCase();
  return CATEGORIAS_PT[key] || cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function textSearch(query, cidade, raioMetros) {
  const params = {
    query: `${query} em ${cidade}`,
    radius: raioMetros,
    language: 'pt-BR',
    key: API_KEY,
  };

  const { data } = await axios.get(`${PLACES_BASE_URL}/textsearch/json`, { params });

  if (data.status === 'REQUEST_DENIED') {
    throw new Error('API Key inválida ou sem permissão. Verifique a chave do Google Places.');
  }

  return data.results || [];
}

async function getPlaceDetails(placeId) {
  const params = {
    place_id: placeId,
    fields: 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,business_status,geometry',
    language: 'pt-BR',
    key: API_KEY,
  };

  const { data } = await axios.get(`${PLACES_BASE_URL}/details/json`, { params });
  return data.result || {};
}

function formatarWhatsApp(telefone) {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `55${digits}`;
  }
  return null;
}

export async function buscarLeads({ cidade, tipo, queryGoogle, raioKm, maxResultados }) {
  if (!API_KEY) {
    throw new Error('GOOGLE_PLACES_API_KEY não configurada. Acesse Configurações para definir.');
  }

  const cacheKey = getCacheKey(cidade, tipo, raioKm);
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return { fromCache: true, leads: cached.slice(0, maxResultados) };
  }

  const raioMetros = raioKm * 1000;

  // Text Search
  const resultados = await textSearch(queryGoogle || tipo, cidade, raioMetros);
  const limitados = resultados.slice(0, maxResultados);

  console.log(`🔍 ${limitados.length} resultados de text search, buscando detalhes...`);

  const leads = [];
  const LOTE = 10;

  for (let i = 0; i < limitados.length; i += LOTE) {
    const lote = limitados.slice(i, i + LOTE);
    const detalhes = await Promise.allSettled(
      lote.map(lugar => getPlaceDetails(lugar.place_id))
    );

    detalhes.forEach((resultado, idx) => {
      const lugar = lote[idx];
      const detalhe = resultado.status === 'fulfilled' ? resultado.value : {};

      const telefone = detalhe.formatted_phone_number || null;
      const whatsapp = formatarWhatsApp(telefone);
      const categoriaBruta = lugar.types?.[0] || null;
      const categoriaTraduzida = traduzirCategoria(categoriaBruta, tipo);

      leads.push({
        place_id: lugar.place_id,
        nome: detalhe.name || lugar.name,
        endereco: detalhe.formatted_address || lugar.formatted_address,
        telefone,
        whatsapp,
        site: detalhe.website || null,
        email: null,
        avaliacao: detalhe.rating || lugar.rating || null,
        num_avaliacoes: detalhe.user_ratings_total || lugar.user_ratings_total || 0,
        horario_funcionamento: detalhe.opening_hours?.weekday_text?.join(' | ') || null,
        aberto_agora: detalhe.opening_hours?.open_now ?? null,
        categoria: categoriaTraduzida,
        cidade,
        tipo_buscado: tipo,
        maps_url: `https://www.google.com/maps/place/?q=place_id:${lugar.place_id}`,
        latitude: lugar.geometry?.location?.lat || detalhe.geometry?.location?.lat,
        longitude: lugar.geometry?.location?.lng || detalhe.geometry?.location?.lng,
      });
    });
  }

  // Salvar no cache
  cache.set(cacheKey, leads, parseInt(process.env.CACHE_DURACAO_HORAS || '24') * 3600);

  return { fromCache: false, leads };
}

export function limparCache(cidade, tipo, raioKm) {
  const key = getCacheKey(cidade, tipo, raioKm);
  cache.del(key);
}
