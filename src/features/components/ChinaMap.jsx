/**
 * src/features/components/ChinaMap.jsx
 * Usa /china-provinces.json (cn-atlas local) e geo.properties.id para matching
 */
import { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';
import { PROVINCES, BOTS } from '../../data/imperioData.js';

// Coordenadas centrais aproximadas de cada província no mapa para posicionar os marcadores de colheita
const PROVINCE_CENTERS = {
  '110000': [116.4, 39.9],   // Beijing
  '120000': [117.2, 39.1],   // Tianjin
  '130000': [114.5, 38.0],   // Hebei
  '140000': [112.5, 37.8],   // Shanxi
  '150000': [111.7, 40.8],   // Inner Mongolia
  '210000': [123.4, 41.8],   // Liaoning
  '220000': [125.3, 43.8],   // Jilin
  '230000': [126.6, 45.7],   // Heilongjiang
  '310000': [121.47, 31.23], // Shanghai
  '320000': [118.8, 32.0],   // Jiangsu
  '330000': [120.15, 30.26], // Zhejiang
  '340000': [117.27, 31.86], // Anhui
  '350000': [119.3, 26.08],  // Fujian
  '360000': [115.9, 28.68],  // Jiangxi
  '370000': [117.0, 36.65],  // Shandong
  '410000': [113.6, 34.76],  // Henan
  '420000': [114.3, 30.58],  // Hubei
  '430000': [112.98, 28.1],  // Hunan
  '440000': [113.26, 23.13], // Guangdong
  '450000': [108.3, 22.8],   // Guangxi
  '460000': [110.3, 20.0],   // Hainan
  '500000': [106.55, 29.56], // Chongqing
  '510000': [104.06, 30.67], // Sichuan
  '520000': [106.7, 26.57],  // Guizhou
  '530000': [102.7, 25.04],  // Yunnan
  '540000': [91.1, 29.6],    // Tibet
  '610000': [108.9, 34.2],   // Shaanxi
  '620000': [103.8, 36.0],   // Gansu
  '630000': [96.0, 35.5],    // Qinghai
  '640000': [106.2, 38.4],   // Ningxia
  '650000': [87.6, 43.8],    // Xinjiang
};

// Arquivo local em public/ — TopoJSON com APENAS o objeto 'provinces'
// (react-simple-maps v3 usa sempre o primeiro objeto do TopoJSON)
const GEO_URL = '/china-provinces.json';

function getFill(provId, playerProvince, botConquest, started) {
  const prov = PROVINCES[provId];
  if (!prov) return '#1a2035'; // território não mapeado

  const bot = botConquest?.[provId];
  const player = playerProvince?.[provId];

  if (bot?.pct >= 100) return BOTS[bot.botId]?.color + 'dd' || '#555';

  const hasPlayer = player && player.pct > 0;
  const hasBot = bot && bot.pct > 0 && bot.pct < 100;

  // Se houver disputa ativa, conquista em andamento ou invasão, retorna a URL do gradiente
  if ((hasPlayer && hasBot) || (hasBot && !hasPlayer) || (hasPlayer && player.pct < 100)) {
    return `url(#grad-${provId})`;
  }

  if (player?.conquered) return prov.color;
  if (player !== undefined && started) return '#2d3f5e'; // disponível (azul slate visível)
  if (!started) return '#1e3050';  // ← não iniciado: azul-marinho visível

  return '#1a2540'; // bloqueada
}

function getStroke(provId, playerProvince, botConquest) {
  const player = playerProvince?.[provId];
  const bot = botConquest?.[provId];
  if (player?.conquered) return '#e8d87a';
  if (bot?.pct >= 100) return 'rgba(255,255,255,0.2)';
  if (player?.pct > 0) return 'rgba(232,216,122,0.5)';
  if (player !== undefined) return 'rgba(255,255,255,0.3)';
  return 'rgba(255,255,255,0.18)'; // stroke visível no estado inicial
}

export default function ChinaMap({ playerProvince, botConquest, pendingCollections = {}, onCollect, onProvinceClick, started }) {
  const [tooltip, setTooltip] = useState(null);

  // Computa gradientes lineares dinâmicos para as batalhas e progresso
  const gradients = [];
  Object.keys(PROVINCES).forEach(provId => {
    const prov = PROVINCES[provId];
    const player = playerProvince?.[provId];
    const bot = botConquest?.[provId];

    const hasPlayer = player && player.pct > 0;
    const hasBot = bot && bot.pct > 0 && bot.pct < 100;

    if (hasPlayer && hasBot) {
      // Disputa ativa Player vs Bot
      const total = player.pct + bot.pct;
      const ratio = Math.round((player.pct / total) * 100);
      gradients.push({
        id: `grad-${provId}`,
        color1: player.conquered ? prov.color : prov.color + 'bb',
        color2: BOTS[bot.botId]?.color || '#555',
        offset: ratio
      });
    } else if (hasBot && !hasPlayer) {
      // Bot invadindo região neutra/trancada
      gradients.push({
        id: `grad-${provId}`,
        color1: '#1a2540',
        color2: BOTS[bot.botId]?.color || '#555',
        offset: 100 - bot.pct
      });
    } else if (hasPlayer && player.pct < 100 && !hasBot) {
      // Player progredindo em região neutra
      gradients.push({
        id: `grad-${provId}`,
        color1: prov.color + 'aa',
        color2: '#2d3f5e',
        offset: player.pct
      });
    }
  });

  return (
    <div className="china-map-wrapper">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 520, center: [104, 36] }}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          {gradients.map(g => (
            <linearGradient key={g.id} id={g.id} x1="0" y1="1" x2="1" y2="0">
              <stop offset={`${g.offset}%`} stopColor={g.color1} />
              <stop offset={`${g.offset}%`} stopColor={g.color2} />
            </linearGradient>
          ))}
        </defs>
        <ZoomableGroup zoom={1} minZoom={0.6} maxZoom={6} center={[104, 36]}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                // cn-atlas usa properties.id ("110000", "440000", etc.)
                const provId = geo.properties?.id;
                const prov = PROVINCES[provId];
                const player = playerProvince?.[provId];
                const bot = botConquest?.[provId];
                const isKnown = !!prov;

                // Clicável: qualquer província conhecida (antes de começar = escolher início)
                const isClickable = isKnown && (!started || player !== undefined);

                const fillColor = getFill(provId, playerProvince, botConquest, started);
                const strokeColor = getStroke(provId, playerProvince, botConquest);

                return (
                  <Geography
                    key={geo.rsmKey || provId}
                    geography={geo}
                    onClick={() => {
                      if (isKnown) onProvinceClick(provId);
                    }}
                    onMouseEnter={() => {
                      if (prov) setTooltip({
                        name: prov.nameCN,
                        hanzi: prov.domainHanzi,
                        domain: prov.domain,
                        pct: player?.pct || 0,
                        conquered: player?.conquered,
                        botPct: bot?.pct,
                        botName: bot ? BOTS[bot.botId]?.hanzi : null,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        fill: fillColor,
                        stroke: strokeColor,
                        strokeWidth: 0.6,
                        outline: 'none',
                        cursor: isKnown ? 'pointer' : 'default',
                        transition: 'fill 0.2s',
                      },
                      hover: {
                        fill: isKnown ? (PROVINCES[provId]?.color + (player?.conquered ? '' : '99') || '#374151') : fillColor,
                        stroke: '#e8d87a88',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: isKnown ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: prov?.color || fillColor,
                        stroke: '#e8d87a',
                        strokeWidth: 1.2,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Marcadores de Colheita de Bi Passivos (Estilo Clash of Clans) */}
          {started && Object.entries(pendingCollections).map(([provId, amount]) => {
            const coords = PROVINCE_CENTERS[provId];
            if (!coords) return null;
            return (
              <Marker key={`collect-${provId}`} coordinates={coords}>
                <g 
                  className="collect-bubble-g"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCollect(provId);
                  }}
                >
                  <circle r="14" fill="#eab308" stroke="#ffffff" strokeWidth="1.5" className="collect-circle-glow" />
                  <text
                    y="4"
                    textAnchor="middle"
                    style={{
                      fontFamily: 'Noto Serif SC, serif',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      fill: '#78350f',
                      userSelect: 'none'
                    }}
                  >
                    筆
                  </text>
                  <rect x="5" y="-18" width="16" height="10" rx="3" fill="#ef4444" />
                  <text
                    x="13"
                    y="-10"
                    textAnchor="middle"
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      fill: '#ffffff',
                      userSelect: 'none'
                    }}
                  >
                    {amount}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip hover */}
      {tooltip && (
        <div className="map-tooltip">
          <div className="tooltip-row">
            <span className="tooltip-hanzi">{tooltip.hanzi}</span>
            <span className="tooltip-name">{tooltip.name}</span>
          </div>
          <span className="tooltip-domain">{tooltip.domain}</span>
          {tooltip.conquered && <span className="tooltip-status ok">完 Conquistada</span>}
          {!tooltip.conquered && tooltip.pct > 0 && <span className="tooltip-status prog">{tooltip.pct}% conquistado</span>}
          {tooltip.botPct > 0 && tooltip.botPct < 100 && <span className="tooltip-status rival">{tooltip.botName} {tooltip.botPct}%</span>}
          {tooltip.botPct >= 100 && <span className="tooltip-status lost">{tooltip.botName} domina</span>}
        </div>
      )}

      {/* Legenda */}
      <div className="map-legend">
        <div className="legend-title">帝國</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#e8d87a' }} /><span>Conquistada</span></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: 'rgba(232,216,122,0.35)' }} /><span>Em progresso</span></div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)' }} /><span>Disponível</span></div>
        {Object.values(BOTS).map(bot => (
          <div key={bot.id} className="legend-item">
            <div className="legend-dot" style={{ background: bot.color + '55', border: `1px solid ${bot.color}` }}>
              <span style={{ color: bot.color, fontSize: 8, fontFamily: 'serif', display: 'block', textAlign: 'center', lineHeight: '12px' }}>{bot.hanzi}</span>
            </div>
            <span style={{ color: bot.color + 'cc' }}>{bot.fullName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
