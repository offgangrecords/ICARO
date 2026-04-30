import * as XLSX from 'xlsx';

function prepararDados(leads) {
  return leads.map(lead => ({
    'Nome': lead.nome || '',
    'Endereço': lead.endereco || '',
    'Cidade': lead.cidade || '',
    'Tipo': lead.tipo_buscado || '',
    'Telefone': lead.telefone || '',
    'WhatsApp': lead.whatsapp ? `https://wa.me/${lead.whatsapp}` : '',
    'Site': lead.site || '',
    'E-mail': lead.email || '',
    'Avaliação': lead.avaliacao || '',
    'Nº Avaliações': lead.num_avaliacoes || 0,
    'Horário': lead.horario_funcionamento || '',
    'Aberto Agora': lead.aberto_agora === true ? 'Sim' : lead.aberto_agora === false ? 'Não' : '',
    'Categoria': lead.categoria || '',
    'Status': lead.status || 'Novo',
    'Google Maps': lead.maps_url || '',
    'Data Prospecção': lead.data_prospeccao
      ? new Date(lead.data_prospeccao).toLocaleDateString('pt-BR')
      : '',
  }));
}

export function gerarCSV(leads) {
  const dados = prepararDados(leads);
  if (dados.length === 0) return '';

  const cabecalho = Object.keys(dados[0]);
  const linhas = dados.map(row =>
    cabecalho.map(col => {
      const val = String(row[col] || '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',')
  );

  return [cabecalho.join(','), ...linhas].join('\n');
}

export function gerarExcel(leads) {
  const dados = prepararDados(leads);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(dados);

  // Estilizar cabeçalho
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E3A5F' } },
    };
  }

  // Larguras das colunas
  ws['!cols'] = [
    { wch: 35 }, { wch: 45 }, { wch: 20 }, { wch: 25 },
    { wch: 18 }, { wch: 35 }, { wch: 30 }, { wch: 30 },
    { wch: 10 }, { wch: 12 }, { wch: 50 }, { wch: 12 },
    { wch: 25 }, { wch: 18 }, { wch: 45 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
