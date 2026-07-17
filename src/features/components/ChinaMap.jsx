/**
 * src/features/components/ChinaMap.jsx
 * Mapa SVG interativo das províncias da China usando react-simple-maps
 */
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { PROVINCES, BOTS } from '../../data/imperioData.js';

// GeoJSON das províncias da China (topojson público)
const CHINA_TOPO_URL = 'https://raw.githubusercontent.com/deldersveld/topojson/master/countries/china/china-provinces.json';

function getProvinceColor(provId, playerProvince, botConquest, started) {
  const prov = PROVINCES[provId];

  // Bot conquistou 100%?
  const bot = botConquest?.[provId];
  if (bot?.pct >= 100) {
    const botData = BOTS[bot.botId];
    return botData?.color || '#555';
  }

  // Player tem conquista?
  const player = playerProvince?.[provId];
  if (player?.conquered) {
    return prov?.color || '#4ade80';
  }

  if (player?.pct > 0) {
    // Em progresso — mistura a cor base com cinza
    return prov?.color ? `${prov.color}99` : '#4ade8099';
  }

  if (player?.available && started) {
    return '#ffffff18'; // disponível mas não iniciada
  }

  return '#1a1a2e'; // bloqueada
}

function getProvinceStroke(provId, playerProvince, botConquest, started) {
  const player = playerProvince?.[provId];
  const bot = botConquest?.[provId];

  if (player?.conquered) return '#ffffff60';
  if (bot?.pct >= 100) return '#ffffff30';
  if (player?.pct > 0) return '#ffffff80';
  if (player?.available && started) return '#ffffff40';
  return '#ffffff15';
}

export default function ChinaMap({ playerProvince, botConquest, onProvinceClick, started }) {
  return (
    <div className="china-map-wrapper">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 420,
          center: [104, 36],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4}>
          <Geographies geography={CHINA_TOPO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const provId = geo.id || geo.properties?.id;
                const prov = PROVINCES[provId];
                const fillColor = getProvinceColor(provId, playerProvince, botConquest, started);
                const strokeColor = getProvinceStroke(provId, playerProvince, botConquest, started);
                const player = playerProvince?.[provId];
                const bot = botConquest?.[provId];
                const isClickable = prov && (!started || player?.available || player?.pct >= 0 || player?.conquered);

                return (
                  <g key={geo.rsmKey || provId}>
                    <Geography
                      geography={geo}
                      onClick={() => isClickable && onProvinceClick(provId)}
                      style={{
                        default: {
                          fill: fillColor,
                          stroke: strokeColor,
                          strokeWidth: 0.8,
                          outline: 'none',
                          cursor: isClickable ? 'pointer' : 'default',
                          transition: 'fill 0.3s ease',
                        },
                        hover: {
                          fill: isClickable ? (prov?.color || '#4ade80') : fillColor,
                          stroke: '#ffffff60',
                          strokeWidth: 1.2,
                          outline: 'none',
                          cursor: isClickable ? 'pointer' : 'default',
                          filter: isClickable ? 'brightness(1.3)' : 'none',
                        },
                        pressed: {
                          fill: prov?.color || '#4ade80',
                          stroke: '#ffffff80',
                          strokeWidth: 1.5,
                          outline: 'none',
                        },
                      }}
                    />
                    {/* Badge de progresso do bot */}
                    {bot?.pct > 0 && bot.pct < 100 && (
                      <text
                        x={geo.properties?.lng || 0}
                        y={geo.properties?.lat || 0}
                        textAnchor="middle"
                        fontSize={8}
                        fill={BOTS[bot.botId]?.color || '#ff0'}
                        style={{ pointerEvents: 'none' }}
                      >
                        {BOTS[bot.botId]?.name} {bot.pct}%
                      </text>
                    )}
                  </g>
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Legenda */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#4ade80' }} />
          <span>Conquistada</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#4ade8055' }} />
          <span>Em progresso</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: '#ffffff18' }} />
          <span>Disponível</span>
        </div>
        {Object.values(BOTS).map(bot => (
          <div key={bot.id} className="legend-item">
            <div className="legend-dot" style={{ background: bot.color }} />
            <span>{bot.emoji} {bot.fullName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
