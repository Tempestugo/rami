/**
 * src/features/components/AbilityTree.jsx
 */
import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone/umd/vis-network.min.js';
import { ABILITY_NODES } from '../../data/abilityTreeData.js';

export default function AbilityTree({ unlockedAbilities, biPoints, onUnlock }) {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    // Paleta de cores para os 4 Pilares da Sociedade
    const PILLAR_COLORS = {
        subsistence: { background: '#22c55e', border: '#16a34a' }, // Verde
        economy: { background: '#eab308', border: '#ca8a04' },     // Amarelo
        intelligence: { background: '#3b82f6', border: '#2563eb' }, // Azul
        expansion: { background: '#ef4444', border: '#dc2626' }     // Vermelho
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const nodes = [];
        const edges = [];

        // Mapeia os dados estáticos para o formato do vis-network
        Object.values(ABILITY_NODES).forEach((ability) => {
            const isUnlocked = !!unlockedAbilities[ability.id];

            // Verifica se o nó pode ser comprado (se todos os pré-requisitos estão desbloqueados)
            const isAvailable = ability.requires.every(req => unlockedAbilities[req]);

            // Estilização condicional do nó
            let nodeColor = { background: '#2a2a2a', border: '#444' }; // Padrão (Bloqueado e Indisponível)
            let fontColor = '#666';

            if (isUnlocked) {
                nodeColor = PILLAR_COLORS[ability.pillar] || { background: '#fff', border: '#ccc' };
                fontColor = '#fff';
            } else if (isAvailable) {
                nodeColor = { background: '#4a4a4a', border: '#888' }; // Disponível para compra
                fontColor = '#ccc';
            }

            nodes.push({
                id: ability.id,
                label: ability.hanzi,
                title: ability.name, // Tooltip nativo
                shape: 'circle',
                color: {
                    background: nodeColor.background,
                    border: nodeColor.border,
                    highlight: { border: '#fff' }
                },
                font: { color: fontColor, size: 24, face: 'ui-sans-serif' },
                borderWidth: 2,
                shadow: isUnlocked
            });

            // Desenha as setas (arestas) baseadas nas dependências
            ability.requires.forEach((reqId) => {
                edges.push({
                    from: reqId,
                    to: ability.id,
                    color: { color: isUnlocked ? '#888' : '#333' },
                    arrows: 'to',
                    dashes: !isUnlocked // Linha tracejada se ainda não foi desbloqueado
                });
            });
        });

        const data = { nodes, edges };

        const options = {
            physics: {
                hierarchicalRepulsion: {
                    centralGravity: 0.0,
                    springLength: 100,
                    springConstant: 0.01,
                    nodeDistance: 120,
                    damping: 0.09
                },
                solver: 'hierarchicalRepulsion'
            },
            layout: {
                hierarchical: {
                    enabled: true,
                    direction: 'UD', // Up-Down (De cima para baixo)
                    sortMethod: 'directed',
                    levelSeparation: 100
                }
            },
            interaction: {
                hover: true,
                dragNodes: false // Fixa os nós para não bagunçar a árvore
            }
        };

        // Inicializa a rede
        networkRef.current = new Network(containerRef.current, data, options);

        // Captura o clique no nó para abrir o painel lateral
        networkRef.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                setSelectedNodeId(params.nodes[0]);
            } else {
                setSelectedNodeId(null);
            }
        });

        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
            }
        };
    }, [unlockedAbilities]); // Atualiza a cor dos nós quando algo é desbloqueado

    const selectedAbility = selectedNodeId ? ABILITY_NODES[selectedNodeId] : null;
    const isUnlocked = selectedAbility ? !!unlockedAbilities[selectedAbility.id] : false;
    const canAfford = selectedAbility ? biPoints >= selectedAbility.cost : false;
    const isAvailable = selectedAbility ? selectedAbility.requires.every(req => unlockedAbilities[req]) : false;

    return (
        <div className="flex h-full w-full bg-ink-950 text-white relative">

            {/* Área do Grafo */}
            <div className="flex-1" ref={containerRef} />

            {/* Painel Lateral de Detalhes da Habilidade */}
            {selectedAbility && (
                <div className="w-80 bg-ink-900 border-l border-white/10 p-6 flex flex-col shadow-2xl z-10">
                    <div className="text-center mb-6">
                        <h2 className="text-6xl font-chinese mb-2">{selectedAbility.hanzi}</h2>
                        <p className="text-xl text-ink-300 tracking-widest">{selectedAbility.pinyin}</p>
                    </div>

                    <h3 className="text-lg font-bold mb-2">{selectedAbility.name}</h3>
                    <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                        {selectedAbility.description}
                    </p>

                    <div className="bg-ink-950 p-4 rounded-lg mb-6 border border-white/5">
                        <span className="text-xs uppercase tracking-wider text-ink-500 block mb-1">Efeito no Império</span>
                        <span className="text-sm font-medium text-green-400">
                            {selectedAbility.buff.value > 0 ? '+' : ''}{selectedAbility.buff.value} {selectedAbility.buff.stat}
                        </span>
                    </div>

                    <div className="mt-auto">
                        {isUnlocked ? (
                            <div className="bg-green-900/30 border border-green-500/50 text-green-400 p-3 rounded-lg text-center text-sm font-bold">
                                Habilidade Ativa
                                {/* Aqui futuramente entrará o botão de "Manutenção / Revisão" */}
                            </div>
                        ) : (
                            <button
                                onClick={() => onUnlock(selectedAbility.id, selectedAbility.cost)}
                                disabled={!isAvailable || !canAfford}
                                className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${isAvailable && canAfford
                                        ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-lg shadow-red-900/20'
                                        : 'bg-ink-800 text-ink-500 cursor-not-allowed'
                                    }`}
                            >
                                {!isAvailable
                                    ? 'Pré-requisitos não atendidos'
                                    : canAfford
                                        ? `Aprender (${selectedAbility.cost} 笔)`
                                        : `Faltam ${selectedAbility.cost - biPoints} 笔`}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}