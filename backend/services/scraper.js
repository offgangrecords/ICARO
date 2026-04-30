import puppeteer from 'puppeteer';
import axios from 'axios';

export async function scrapeGoogleMaps({ cidade, tipo, queryGoogle, maxResultados, ignorarNomes = [], ignorarIds = [] }) {
  console.log(`🚀 Iniciando Scraping Gratuito para: ${tipo} em ${cidade}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox", 
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ]
  });

  const page = await browser.newPage();
  
  // Define um User-Agent real para evitar bloqueios
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(queryGoogle || tipo)}+em+${encodeURIComponent(cidade)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });

    const leads = [];
    let anteriorCount = 0;
      // Função de scroll V6: Teclado Puro (Seta para baixo) para forçar carregamento
    async function scrollSidebar() {
      try {
        await page.focus('div[role="feed"]').catch(() => {});
        for(let i=0; i<15; i++) {
          await page.keyboard.press('ArrowDown');
          await new Promise(r => setTimeout(r, 50));
        }
        await page.keyboard.press('PageDown');
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {}
    }

    let tentativasSemNovos = 0;
    let localLeadsMap = new Map(); 

    while (localLeadsMap.size < maxResultados && tentativasSemNovos < 20) {
      const results = await page.evaluate((ignorarIds, ignorarNomes) => {
        const items = Array.from(document.querySelectorAll('div[role="article"]'));
        
        return items.map(item => {
          const link = item.querySelector('a.hfpxzc') || item.querySelector('a');
          const href = link?.href || '';
          const placeId = href.split('!1s')[1]?.split('!')[0] || href.split('?')[0].split('/').pop() || Math.random().toString();
          const nome = item.querySelector('.fontHeadlineSmall')?.innerText?.trim();

          if (!nome || ignorarIds.includes(placeId) || ignorarNomes.some(n => n?.toLowerCase() === nome.toLowerCase())) return null;

          // Parsing Ultra-Preciso V6
          const container = item.innerText;
          const lines = container.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          
          // Isola o Telefone (Busca por padrão numérico de celular/fixo brasileiro)
          const telMatch = container.match(/\(?\d{2}\)?\s?9?\d{4}-?\d{4}/);
          const telefone = telMatch ? telMatch[0] : null;

          // Isola o Endereço (Pula a primeira linha se for o nome, e pula a categoria)
          let endereco = '';
          const categoriasComuns = ['Farmácia', 'Drogaria', 'Hospital', 'Clínica', 'Empresa farmacêutica', 'Saúde', 'Dentista'];
          
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Um endereço real geralmente tem números e não é uma categoria pura
            if (/\d/.test(line) && 
                !categoriasComuns.some(cat => line.includes(cat)) && 
                line !== telefone && 
                line !== nome &&
                (line.includes(',') || line.includes('Av.') || line.includes('Rua') || line.includes('R.'))) {
              endereco = line.replace(/·/g, '').trim();
              break;
            }
          }

          // Se ainda não achou, pega a linha que contém o telefone e tenta extrair o que vem antes
          if (!endereco) {
            const fallback = lines.find(l => /\d/.test(l) && (l.includes('Av') || l.includes('Rua') || l.includes('Rod')));
            if (fallback) endereco = fallback.replace(/·/g, '').trim();
          }

          return { place_id: placeId, nome, maps_url: href, endereco, telefone };
        }).filter(Boolean);
      }, ignorarIds, ignorarNomes);

      let novosNestaRodada = 0;
      for (const res of results) {
        if (!localLeadsMap.has(res.place_id)) {
          localLeadsMap.set(res.place_id, res);
          novosNestaRodada++;
        }
      }

      if (novosNestaRodada === 0) tentativasSemNovos++;
      else tentativasSemNovos = 0;

      await scrollSidebar();
      console.log(`🔎 Minerados: ${localLeadsMap.size} / ${maxResultados}`);
    }

    const leadsFinal = Array.from(localLeadsMap.values());
    
    const leadsFormatados = leadsFinal.slice(0, maxResultados).map(l => ({
      ...l,
      whatsapp: l.telefone ? '55' + l.telefone.replace(/\D/g, '') : null,
      site: null,
      horario_funcionamento: "Ver no Maps",
      categoria: tipo,
      cidade,
      tipo_buscado: tipo,
      latitude: null,
      longitude: null,
    }));

    for (let lead of leadsFormatados) {
      if (lead.endereco) {
        try {
          const cleanAddr = lead.endereco.split(',')[0].replace(/^\d+\s+/, '').trim();
          const query = `${cleanAddr}, ${cidade}`;
          const res = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: { q: query, format: 'json', limit: 1 },
            headers: { 'User-Agent': 'Icaro/6.0' }
          });
          if (res.data?.[0]) {
            lead.latitude = parseFloat(res.data[0].lat);
            lead.longitude = parseFloat(res.data[0].lon);
          }
          await new Promise(r => setTimeout(r, 400)); 
        } catch (err) {}
      }
    }

    return leadsFormatados;

  } catch (error) {
    console.error("❌ Erro no Scraping:", error);
    throw error;
  } finally {
    await browser.close();
  }
}
