import { scrapeGoogleMaps } from './services/scraper.js';

async function test() {
  try {
    const leads = await scrapeGoogleMaps({
      cidade: 'Adustina, BA',
      tipo: 'Distribuidor de produtos odontológicos',
      queryGoogle: 'distribuidor produtos odontológicos',
      maxResultados: 5,
    });
    console.log('Resultados:', leads);
  } catch (error) {
    console.error('ERRO:', error);
  }
}

test();
