import { useState, useCallback } from 'react';
import { ExternalLink, MapPin, Star, Phone, Globe, Clock, ChevronUp, ChevronDown } from 'lucide-react';

const STATUS_CLASSES = {
  'Novo': 'badge-novo',
  'Contato realizado': 'badge-contato',
  'Proposta enviada': 'badge-proposta',
  'Cliente': 'badge-cliente',
  'Descartado': 'badge-descartado',
};

const STATUS_OPTS = ['Novo', 'Contato realizado', 'Proposta enviada', 'Cliente', 'Descartado'];

function Estrelas({ valor }) {
  if (!valor) return <span className="text-muted text-xs">—</span>;
  const cheias = Math.floor(valor);
  return (
    <span className="flex items-center gap-1">
      <span className="text-warning font-semibold text-sm">{valor.toFixed(1)}</span>
      <span className="text-warning text-xs">{'★'.repeat(cheias)}{'☆'.repeat(5 - cheias)}</span>
    </span>
  );
}

function CelulaTexto({ texto, maxWidth = 'max-w-[180px]' }) {
  if (!texto) return <span className="text-muted/50 text-xs">—</span>;
  return (
    <span className={`block truncate ${maxWidth}`} title={texto}>
      {texto}
    </span>
  );
}

function ColunaHeader({ label, campo, ordemAtual, direcao, onOrdenar }) {
  const ativo = ordemAtual === campo;
  return (
    <th
      onClick={() => onOrdenar(campo)}
      className={`th cursor-pointer select-none hover:text-gray-100 transition-colors ${ativo ? 'text-primary-400' : ''}`}
    >
      <span className="flex items-center gap-1">
        {label}
        {ativo ? (
          direcao === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

export default function TabelaLeads({ leads, selecionados, onSelecionar, onStatusChange, modo = 'busca' }) {
  const [ordem, setOrdem] = useState('avaliacao');
  const [direcao, setDirecao] = useState('desc');

  const getId = (lead) => modo === 'busca' ? lead.place_id : lead.id;

  const handleOrdenar = useCallback((campo) => {
    setOrdem(prev => {
      if (prev === campo) {
        setDirecao(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setDirecao('desc');
      }
      return campo;
    });
  }, []);

  const leadsOrdenados = [...leads].sort((a, b) => {
    const va = a[ordem];
    const vb = b[ordem];
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    const cmp = typeof va === 'string' ? va.localeCompare(vb, 'pt-BR') : va - vb;
    return direcao === 'asc' ? cmp : -cmp;
  });

  const toggleTodos = () => {
    if (selecionados.size === leads.length) {
      onSelecionar(new Set());
    } else {
      onSelecionar(new Set(leads.map(getId)));
    }
  };

  const toggleLead = (lead) => {
    const id = getId(lead);
    const novo = new Set(selecionados);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    onSelecionar(novo);
  };

  const todosSelec = leads.length > 0 && selecionados.size === leads.length;
  const parcialSelec = selecionados.size > 0 && selecionados.size < leads.length;

  const colunaProps = { ordemAtual: ordem, direcao, onOrdenar: handleOrdenar };

  return (
    <div className="table-container animate-fade-in">
      <table className="table min-w-[900px]">
        <thead>
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                id="chk-selecionar-todos"
                checked={todosSelec}
                ref={el => { if (el) el.indeterminate = parcialSelec; }}
                onChange={toggleTodos}
                className="w-4 h-4 rounded border-card-border bg-surface accent-primary-500 cursor-pointer"
              />
            </th>
            <ColunaHeader label="Nome" campo="nome" {...colunaProps} />
            <ColunaHeader label="Endereço" campo="endereco" {...colunaProps} />
            <ColunaHeader label="Telefone" campo="telefone" {...colunaProps} />
            <ColunaHeader label="Avaliação" campo="avaliacao" {...colunaProps} />
            <ColunaHeader label="Avaliações" campo="num_avaliacoes" {...colunaProps} />
            {modo === 'base' && <ColunaHeader label="Status" campo="status" {...colunaProps} />}
            <th className="px-4 py-3">Site</th>
            <th className="px-4 py-3">Horário</th>
            <th className="px-4 py-3 w-20">Ações</th>
          </tr>
        </thead>
        <tbody>
          {leadsOrdenados.map((lead, idx) => {
            const id = getId(lead);
            const isSelected = selecionados.has(id);

            return (
              <tr
                key={id || idx}
                className={`transition-colors ${isSelected ? 'selected' : ''}`}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleLead(lead)}
                    className="w-4 h-4 rounded border-card-border bg-surface accent-primary-500 cursor-pointer"
                  />
                </td>

                {/* Nome */}
                <td className="px-4 py-2.5">
                  <div className="max-w-[200px]">
                    <p className="text-gray-200 font-medium truncate text-sm" title={lead.nome}>
                      {lead.nome}
                    </p>
                    {lead.categoria && (
                      <p className="text-xs text-muted truncate">{lead.categoria}</p>
                    )}
                  </div>
                </td>

                {/* Endereço */}
                <td className="px-4 py-2.5">
                  <CelulaTexto texto={lead.endereco} maxWidth="max-w-[220px]" />
                </td>

                {/* Telefone / WhatsApp */}
                <td className="px-4 py-2.5">
                  {lead.telefone ? (
                    <div className="space-y-0.5">
                      <a
                        href={`tel:${lead.telefone.replace(/\D/g, '')}`}
                        className="flex items-center gap-1 text-sm text-gray-300 hover:text-primary-400 transition-colors"
                      >
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{lead.telefone}</span>
                      </a>
                      {lead.whatsapp && (
                        <a
                          href={`https://wa.me/${lead.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-success hover:underline flex items-center gap-1"
                        >
                          <span>📱</span> WhatsApp
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted/50 text-xs">—</span>
                  )}
                </td>

                {/* Avaliação */}
                <td className="px-4 py-2.5">
                  <Estrelas valor={lead.avaliacao} />
                </td>

                {/* Nº Avaliações */}
                <td className="px-4 py-2.5">
                  <span className="text-sm text-gray-400">
                    {lead.num_avaliacoes > 0 ? lead.num_avaliacoes.toLocaleString('pt-BR') : '—'}
                  </span>
                </td>

                {/* Status (apenas no modo base) */}
                {modo === 'base' && (
                  <td className="px-4 py-2.5">
                    {onStatusChange ? (
                      <select
                        value={lead.status || 'Novo'}
                        onChange={e => onStatusChange(lead.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border font-semibold cursor-pointer bg-transparent outline-none transition-colors ${
                          STATUS_CLASSES[lead.status] || 'badge-novo'
                        }`}
                        style={{ minWidth: '120px' }}
                      >
                        {STATUS_OPTS.map(s => (
                          <option key={s} value={s} className="bg-navy-800 text-gray-200">{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={STATUS_CLASSES[lead.status] || 'badge-novo'}>
                        {lead.status || 'Novo'}
                      </span>
                    )}
                  </td>
                )}

                {/* Site */}
                <td className="px-4 py-2.5">
                  {lead.site ? (
                    <a
                      href={lead.site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors max-w-[140px]"
                      title={lead.site}
                    >
                      <Globe className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{lead.site.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  ) : <span className="text-muted/50 text-xs">—</span>}
                </td>

                {/* Horário */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 max-w-[160px]" title={lead.horario_funcionamento || ''}>
                    <Clock className="w-3 h-3 text-muted flex-shrink-0" />
                    {lead.aberto_agora === true && (
                      <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" title="Aberto agora" />
                    )}
                    {lead.aberto_agora === false && (
                      <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" title="Fechado agora" />
                    )}
                    <span className="text-xs text-muted truncate">
                      {lead.horario_funcionamento === 'Ver no Maps' && lead.maps_url ? (
                        <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">
                          Ver no Google Maps
                        </a>
                      ) : (
                        lead.horario_funcionamento ? lead.horario_funcionamento.split('|')[0].trim() : '—'
                      )}
                    </span>
                  </div>
                </td>

                {/* Ações */}
                <td className="px-4 py-2.5">
                  {lead.maps_url && (
                    <a
                      href={lead.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no Google Maps"
                      className="btn-ghost btn-sm inline-flex !px-2 !py-1.5 text-muted hover:text-primary-400"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {lead.maps_url && (
                    <a
                      href={lead.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir em nova aba"
                      className="btn-ghost btn-sm inline-flex !px-2 !py-1.5 text-muted hover:text-primary-400"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {leads.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">
          Nenhum resultado para exibir
        </div>
      )}
    </div>
  );
}
