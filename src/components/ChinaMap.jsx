/**
 * src/features/components/ChinaMap.jsx
 */
import React, { useMemo, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

// O seu JSON da China (vetores)
import chinaGeoJson from '../../data/china.json';
// A sua base de dados de regras
import { PROVINCES, BOTS } from '../../data/imperioData.js';

export default function ChinaMap({ playerProvince, botConquest, onProvinceClick, started }) {

    useEffect(() => {
        echarts.registerMap('china', chinaGeoJson);
    }, []);

    const mapData = useMemo(() => {
        const data = [];

        Object.keys(PROVINCES).forEach(provId => {
            const provinceName = PROVINCES[provId].nameCN;
            let value = 0;

            // Cores Base estilo "Monitra"
            let color = '#5c6b79'; // Cinza-azulado fosco para territórios neutros
            let tooltipText = 'Território Desconhecido';

            const playerState = playerProvince?.[provId];
            const botState = botConquest?.[provId];

            if (playerState && playerState.pct > 0) {
                value = playerState.pct;
                // Vermelho "Sangue" do Império do Jogador (Aumenta a opacidade com a conquista)
                // Usando o RGB do vermelho clássico: 201, 42, 42
                color = `rgba(201, 42, 42, ${0.4 + (value / 100) * 0.6})`;
                tooltipText = `Seu Império: ${value}%`;
            } else if (botState && botState.pct > 0) {
                value = botState.pct;
                // Os Bots rivais recebem uma cor escura/roxa para contrastar com o cinza
                const botColor = BOTS[botState.botId]?.color || '88, 28, 135';
                color = `rgba(${botColor}, ${0.4 + (value / 100) * 0.6})`;
                tooltipText = `Rival (${BOTS[botState.botId]?.name}): ${value}%`;
            }

            data.push({
                name: provinceName,
                value: value,
                itemStyle: { areaColor: color },
                originalId: provId,
                tooltipText: tooltipText
            });
        });

        return data;
    }, [playerProvince, botConquest]);

    const option = useMemo(() => {
        return {
            // Fundo completamente transparente para herdar o background do React (bg-ink-950)
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    if (!params.data) return params.name;
                    return `<div style="font-family: ui-sans-serif, system-ui;">
                    <b style="font-size: 14px;">${params.name}</b><br/>
                    <span style="color: #a39a8e; font-size: 12px;">${params.data.tooltipText}</span>
                  </div>`;
                },
                backgroundColor: 'rgba(15, 15, 15, 0.95)',
                borderColor: '#333',
                borderWidth: 1,
                textStyle: { color: '#fff' },
                padding: [10, 15]
            },
            series: [
                {
                    type: 'map',
                    map: 'china',
                    roam: true,
                    zoom: 1.2,
                    // Define a cor das fronteiras (o segredo do estilo Monitra)
                    itemStyle: {
                        borderColor: '#121212', // Fronteiras quase pretas
                        borderWidth: 1,
                        areaColor: '#5c6b79', // Fallback color
                    },
                    label: {
                        show: false, // Esconde os nomes por padrão para um visual mais "limpo" e focado nos dados
                    },
                    emphasis: {
                        label: {
                            show: true,
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            // Quando o mouse passa por cima, a província clareia levemente
                            areaColor: '#7a8b99',
                            shadowBlur: 0, // Removido o glow excessivo para manter o design "Flat" do Monitra
                            borderColor: '#fff',
                            borderWidth: 1.5
                        }
                    },
                    // Aplica o comportamento de "Select" (quando a província está clicada)
                    select: {
                        itemStyle: {
                            areaColor: '#e8442b',
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: { show: true, color: '#fff' }
                    },
                    data: mapData
                }
            ]
        };
    }, [mapData]);

    const onEvents = {
        click: (params) => {
            if (params.data && params.data.originalId) {
                onProvinceClick(params.data.originalId);
            }
        }
    };

    return (
        // O fundo bg-ink-950 ou equivalente do Tailwind para criar o "Dark Mode" absoluto ao redor do mapa
        <div className="w-full h-full min-h-[600px] bg-[#0b0c10] rounded-xl border border-white/5 shadow-2xl overflow-hidden relative">
            <ReactECharts
                option={option}
                onEvents={onEvents}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
            />

            {/* Opcional: Um efeito de "Vignette" nas bordas do mapa para aumentar o drama */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
        </div>
    );
}