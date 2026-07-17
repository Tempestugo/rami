/**
 * src/features/components/ChinaMap.jsx
 * Mapa SVG interativo das províncias da China usando react-simple-maps
 * Matching por geo.properties.NAME_1 (Natural Earth / deldersveld topojson)
 */
import { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { PROVINCES, BOTS } from '../../data/imperioData.js';

const CHINA_TOPO_URL = 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/china/china-provinces.json';

function getProvince(geo) {
  const name1 = geo.properties?.NAME_1 || geo.properties?.name || '';
  // Exact match first
  if (PROVINCES[name1]) return PROVINCES[name1];
  // Partial match fallback
  const key = Object.keys(PROVINCES).find(k =>
    name1.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name1.toLowerCase())
  );
  return key ? PROVINCES[key] : null;
}

function getProvinceId(geo) {
  const name1 = geo.properties?.NAME_1 || geo.properties?.name || '';
  if (PROVINCES[name1]) return name1;
  return Object.keys(PROVINCES).find(k =>
    name1.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name1.toLowerCase())
  ) || null;
}

function getFill(provId, playerProvince, botConquest, started) {
  const prov = PROVINCES[provId];
  if (!prov) return '#111827'; // desconhecida — cinza escuro

  const bot = botConquest?.[provId];
  if (bot?.pct >= 100) return BOTS[bot.botId]?.color + 'cc' || '#555';

  const player = playerProvince?.[provId];
  if (player?.conquered) return prov.color;
  if (player?.pct > 0) return prov.color + '88';
  if ((player?.available || player !== undefined) && started) return '#1f2937';
  if (!started) return '#111827';

  return '#0d1117';
}

function getStroke(provId, playerProvince, botConquest, started) {
  const player = playerProvince?.[provId];
  const bot = botConquest?.[provId];
  if (player?.conquered) return '#e8d87a';
  if (bot?.pct >= 100) return 'rgba(255,255,255,0.2)';
  if (player?.pct > 0) return 'rgba(232,216,122,0.5)';
  if (player?.available && started) return 'rgba(255,255,255,0.25)';
  return 'rgba(255,255,255,0.08)';
}

export default function ChinaMap({ playerProvince, botConquest, onProvinceClick, started }) {
  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="china-map-wrapper">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 430, center: [104, 36] }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup zoom={1} minZoom={0.7} maxZoom={5}>
          <Geographies geography={CHINA_TOPO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const prov = getProvince(geo);
                const provId = getProvinceId(geo);
                const player = playerProvince?.[provId];
                const bot = botConquest?.[provId];
                const isKnown = !!prov;
                const isClickable = isKnown && (!started || player !== undefined || !started);
                const fillColor = getFill(provId, playerProvince, botConquest, started);
                const strokeColor = getStroke(provId, playerProvince, botConquest, started);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => isClickable && provId && onProvinceClick(provId)}
                    onMouseEnter={() => prov && setTooltip({ name: prov.nameCN, domain: prov.domainHanzi, pct: player?.pct || 0, botPct: bot?.pct })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        fill: fillColor,
                        stroke: strokeColor,
                        strokeWidth: 0.7,
                        outline: 'none',
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'fill 0.25s ease',
                      },
                      hover: {
                        fill: isKnown ? (PROVINCES[provId]?.color || '#374151') : fillColor,
                        stroke: '#e8d87a88',
                        strokeWidth: 1.2,
                        outline: 'none',
                        cursor: isClickable ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: PROVINCES[provId]?.color || fillColor,
                        stroke: '#e8d87a',
                        strokeWidth: 1.5,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div className="map-tooltip">
          <span className="tooltip-hanzi">{tooltip.domain}</span>
          <span className="tooltip-name">{tooltip.name}</span>
          {tooltip.pct > 0 && <span className="tooltip-pct">{tooltip.pct}% conquistado</span>}
          {tooltip.botPct > 0 && <span className="tooltip-bot-pct">{tooltip.botPct}% rival</span>}
        </div>
      )}

      {/* Legenda */}
      <div className="map-legend">
        <div className="legend-title">帝國</div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#e8d87a' }} />
          <span>Conquistada</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'rgba(232,216,122,0.4)' }} />
          <span>Em progresso</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#1f2937' }} />
          <span>Disponível</span>
        </div>
        {Object.values(BOTS).map(bot => (
          <div key={bot.id} className="legend-item">
            <div className="legend-dot legend-hanzi" style={{ background: bot.color + '44', borderColor: bot.color }}>
              <span style={{ color: bot.color, fontSize: 9 }}>{bot.hanzi}</span>
            </div>
            <span>{bot.fullName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
