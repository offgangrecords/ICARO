import { Download, BookmarkPlus, Clipboard, X } from 'lucide-react';

export default function BarraAcoes({ selecionados, total, onSalvar, onCSV, onExcel }) {
  const count = selecionados.length;

  if (count === 0 && total === 0) return null;

  const leadsParaExportar = count > 0 ? count : total;

  return (
    <div className={`flex items-center gap-2 flex-wrap p-3 rounded-xl border transition-all duration-300 ${
      count > 0
        ? 'bg-primary-600/10 border-primary-500/40 shadow-glow-sm'
        : 'bg-surface border-card-border'
    }`}>
      {count > 0 && (
        <span className="text-sm font-semibold text-primary-400 mr-1">
          {count} selecionado{count > 1 ? 's' : ''}
        </span>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          id="btn-exportar-csv"
          onClick={onCSV}
          className="btn-secondary btn-sm"
          title={`Exportar ${leadsParaExportar} leads como CSV`}
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>

        <button
          id="btn-exportar-excel"
          onClick={onExcel}
          className="btn-secondary btn-sm"
          title={`Exportar ${leadsParaExportar} leads como Excel`}
        >
          <Download className="w-3.5 h-3.5" />
          Excel
        </button>

        {count > 0 && (
          <>
            <div className="w-px h-5 bg-card-border" />

            <button
              id="btn-salvar-leads"
              onClick={onSalvar}
              className="btn-success btn-sm"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Salvar na base ({count})
            </button>

            <button
              id="btn-copiar-clipboard"
              onClick={() => {
                const texto = selecionados
                  .map(l => `${l.nome}\t${l.endereco}\t${l.telefone || ''}\t${l.site || ''}`)
                  .join('\n');
                navigator.clipboard.writeText(texto);
              }}
              className="btn-ghost btn-sm"
              title="Copiar para área de transferência"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Copiar
            </button>
          </>
        )}
      </div>

      {count === 0 && total > 0 && (
        <span className="text-xs text-muted ml-auto">
          Exportando todos os {total} resultados
        </span>
      )}
    </div>
  );
}
