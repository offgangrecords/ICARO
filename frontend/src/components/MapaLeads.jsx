import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, GeoJSON } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix ícones padrão do Leaflet com Webpack/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Cores por status
const COR_STATUS = {
  'Novo':               '#3B82F6',
  'Contato realizado':  '#F59E0B',
  'Proposta enviada':   '#8B5CF6',
  'Cliente':            '#10B981',
  'Sem interesse':      '#6B7280',
};

function criarIcone(status) {
  const cor = COR_STATUS[status] || '#3B82F6';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24C24 5.373 18.627 0 12 0z"
            fill="${cor}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.85"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: '',
  });
}


const REGIAO_COORDS = {
  'Norte':        { centro: [-3.46, -62.21], zoom: 5 },
  'Nordeste':     { centro: [-8.28, -39.46], zoom: 6 },
  'Centro-Oeste': { centro: [-15.78, -52.00], zoom: 6 },
  'Sudeste':      { centro: [-21.00, -45.00], zoom: 6 },
  'Sul':          { centro: [-27.00, -52.00], zoom: 6 },
};

// Mapa simplificado de centros de estados para zoom rápido
const ESTADO_COORDS = {
  'SP': [-23.55, -46.63], 'RJ': [-22.90, -43.17], 'MG': [-19.92, -43.94],
  'BA': [-12.97, -38.50], 'PR': [-25.42, -49.27], 'RS': [-30.03, -51.23],
  'PE': [-8.05, -34.88],  'CE': [-3.71, -38.54],  'PA': [-1.45, -48.49],
  'SC': [-27.59, -48.54], 'GO': [-16.68, -49.25], 'MA': [-2.53, -44.30],
  'PB': [-7.11, -34.86],  'ES': [-20.31, -40.31], 'RN': [-5.79, -35.20],
  'AL': [-9.66, -35.73],  'PI': [-5.09, -42.80],  'MT': [-15.60, -56.09],
  'MS': [-20.44, -54.64], 'SE': [-10.91, -37.07], 'AM': [-3.11, -60.02],
  'RO': [-8.76, -63.90],  'AC': [-9.97, -67.81],  'AP': [0.03, -51.06],
  'RR': [2.82, -60.67],   'TO': [-10.16, -48.33], 'DF': [-15.78, -47.93],
};

function AjustarBounds({ leads, centroBusca, focus, setGeojson, geojson }) {
  const map = useMap();
  
  // Efeito para lidar apenas com mudanças de foco (Região/Estado/Cidade)
  useEffect(() => {
    if (!focus) return;

    const carregarPoligono = async () => {
      let query = '';
      let zoom = 13;

      if (focus.tipo === 'regiao' && REGIAO_COORDS[focus.valor]) {
        const { centro, zoom: rZoom } = REGIAO_COORDS[focus.valor];
        map.flyTo(centro, rZoom, { duration: 1.5 });
        setGeojson(null);
        return;
      } 
      
      if (focus.tipo === 'estado') {
        setGeojson(null); // Limpa contorno anterior para não confundir
        query = `https://nominatim.openstreetmap.org/search?state=${focus.valor}&country=Brazil&polygon_geojson=1&format=json&limit=1`;
        zoom = 7;
        if (ESTADO_COORDS[focus.valor]) map.flyTo(ESTADO_COORDS[focus.valor], zoom, { duration: 1.5 });
      } else if (focus.tipo === 'cidade') {
        setGeojson(null); // Limpa para desenhar apenas o NOVO contorno da cidade
        const partes = focus.valor.split(',');
        if (partes.length < 2) return; // Só busca se tiver "Cidade, UF"
        
        const cidade = partes[0].trim();
        const estado = partes[1].trim();
        
        if (cidade.length < 3) return;

        // Busca ULTRA estruturada: city + state + country + settlement filter
        query = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cidade)}&state=${encodeURIComponent(estado)}&country=Brazil&polygon_geojson=1&format=json&limit=1&featuretype=settlement`;
        zoom = 13;
      }

      if (query) {
        try {
          const res = await axios.get(query);
          if (res.data?.[0]) {
            if (focus.tipo === 'cidade') map.flyTo([parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)], zoom, { duration: 1.5 });
            if (res.data[0].geojson) setGeojson(res.data[0].geojson);
          }
        } catch (e) {
          console.error("Erro ao carregar contorno:", e);
        }
      }
    };

    carregarPoligono();
  }, [focus, map]); // Só re-executa se o foco mudar

  // Efeito separado para lidar com novos leads (sem resetar o GeoJSON)
  useEffect(() => {
    if (leads.length > 0) {
      const coords = leads.map(l => [l.latitude, l.longitude]);
      if (centroBusca) coords.push([centroBusca.lat, centroBusca.lng]);
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], animate: true });
    } else if (centroBusca && !focus) {
      map.flyTo([centroBusca.lat, centroBusca.lng], 13, { duration: 1.5 });
    }
  }, [leads, centroBusca, map]);

  return null;
}

const STATUS_LABEL = {
  'Novo': 'Novo',
  'Contato realizado': 'Contato Realizado',
  'Proposta enviada': 'Proposta Enviada',
  'Cliente': 'Cliente',
  'Sem interesse': 'Sem Interesse',
};

export default function MapaLeads({ leads = [], centroBusca = null, focus = null }) {
  const [geojson, setGeojson] = useState(null);
  const leadsValidos = leads.filter(l => l.latitude && l.longitude);

  // Limites do Brasil para a trava do mapa
  const boundsBrasil = L.latLngBounds([
    [-34.0, -74.5], // Sudoeste
    [6.0, -32.0]    // Nordeste
  ]);

  const centroBrasil = [-14.235, -51.925];

  return (
    <div className="w-full h-full rounded-xl overflow-hidden relative border border-card-border">
      {/* Legenda Flutuante */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-navy-800/90 border border-card-border rounded-lg p-3 shadow-2xl backdrop-blur-sm hidden md:block">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Legenda de Status</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(COR_STATUS).map(([status, cor]) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cor }} />
              <span className="text-[10px] text-gray-300">{STATUS_LABEL[status] || status}</span>
            </div>
          ))}
        </div>
      </div>

      <MapContainer
        center={centroBrasil}
        zoom={4}
        maxBounds={boundsBrasil}
        maxBoundsViscosity={1.0}
        minZoom={4}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AjustarBounds leads={leadsValidos} centroBusca={centroBusca} focus={focus} setGeojson={setGeojson} />
        
        {geojson && (
          <GeoJSON 
            data={geojson} 
            style={{ 
              color: '#EF4444', 
              weight: 3, 
              fillColor: '#EF4444', 
              fillOpacity: 0.08,
              dashArray: '5, 10'
            }} 
          />
        )}

        {leadsValidos.map((lead, idx) => {
          const isSalvo = !!lead.id && isNaN(lead.id) === false; 
          const status = lead.status || (isSalvo ? 'Cliente' : 'Novo');

          return (
            <Marker
              key={lead.id || lead.place_id || idx}
              position={[lead.latitude, lead.longitude]}
              icon={criarIcone(status)}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm text-gray-900 leading-tight">{lead.nome}</p>
                    {lead.avaliacao && (
                      <span className="text-xs text-amber-600 font-bold ml-2 whitespace-nowrap">⭐ {lead.avaliacao}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {lead.cidade}
                  </p>
                  
                  <div className="space-y-1.5">
                    {lead.telefone && (
                      <p className="text-xs text-gray-700 flex items-center gap-1.5">
                         <span className="font-semibold text-gray-400">Tel:</span> {lead.telefone}
                      </p>
                    )}
                    
                    <div className="pt-1 border-t border-gray-100 mt-2">
                       <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                          isSalvo ? 'bg-success/10 text-success' : 'bg-primary-500/10 text-primary-600'
                        }`}
                      >
                        {isSalvo ? `Salvo: ${STATUS_LABEL[status]}` : 'Novo Lead'}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
