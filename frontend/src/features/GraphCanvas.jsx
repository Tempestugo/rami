import React, { useEffect, useRef, useState } from 'react';
import { Network, DataSet } from 'vis-network/standalone/umd/vis-network.min.js';
import { graphApi } from '../services/api';
import useStore from '../store/useStore';
import RadialMenu from '../components/RadialMenu';

export default function GraphCanvas() {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDataset = useRef(new DataSet([]));
  const edgesDataset = useRef(new DataSet([]));

  const { graphMode, maxHsk, activeContext, setActiveCharacter } = useStore();
  
  // Estado para o Menu Radial
  const [menuState, setMenuState] = useState({ visible: false, x: 0, y: 0, nodeId: null });

  // 1. Carregamento Inicial (Apenas Raízes se não houver contexto)
  useEffect(() => {
    const loadGraph = async () => {
      try {
        const data = await graphApi.getGraph({
          maxHsk,
          context: activeContext,
          mode: graphMode,
          rootsOnly: !activeContext // Se não houver filtro de contexto, pede só raízes!
        });

        const formattedNodes = data.nodes.map(n => ({
          id: n.id,
          label: n.id,
          title: `HSK ${n.hsk} | ${n.pinyin}`,
          color: { 
            background: n.hsk === 1 ? '#4361ee' : (n.hsk === 2 ? '#2a9d8f' : '#f4a261'),
            border: 'rgba(0,0,0,0.1)' 
          }
        }));

        nodesDataset.current.clear();
        edgesDataset.current.clear();
        nodesDataset.current.add(formattedNodes);
        edgesDataset.current.add(data.edges);

      } catch (err) {
        console.error("Failed to load initial graph:", err);
      }
    };
    loadGraph();
  }, [maxHsk, activeContext, graphMode]);

  // 2. Inicializar o Vis.js apenas uma vez
  useEffect(() => {
    const options = {
      nodes: { shape: 'circle', font: { size: 26, color: '#fff' }, margin: 14 },
      edges: { width: 2, color: '#adb5bd', arrows: 'to', smooth: { type: 'continuous' } },
      physics: {
        barnesHut: { gravitationalConstant: -2500, centralGravity: 0.15, springLength: 140 },
        stabilization: { iterations: 100 }
      },
      interaction: { hover: true }
    };

    networkRef.current = new Network(containerRef.current, {
      nodes: nodesDataset.current,
      edges: edgesDataset.current
    }, options);

    // Evento de Clique num Nó
    networkRef.current.on("click", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        setActiveCharacter(nodeId);
        
        // Coordenadas do ecrã para desenhar o Menu Radial
        const domCoords = networkRef.current.canvasToDOM({ x: params.pointer.canvas.x, y: params.pointer.canvas.y });
        
        setMenuState({
          visible: true,
          x: domCoords.x,
          y: domCoords.y,
          nodeId: nodeId
        });
      } else {
        // Clicou no vazio, esconde o menu
        setMenuState({ visible: false, x: 0, y: 0, nodeId: null });
      }
    });

    // Esconder menu se o utilizador arrastar a tela
    networkRef.current.on("dragStart", () => setMenuState(prev => ({ ...prev, visible: false })));
    networkRef.current.on("zoom", () => setMenuState(prev => ({ ...prev, visible: false })));

    return () => {
      if (networkRef.current) networkRef.current.destroy();
    };
  }, [setActiveCharacter]);

  // 3. Função Mágica de Expandir (Lazy Loading)
  const handleExpand = async (expansionMode) => {
    if (!menuState.nodeId) return;
    try {
      const data = await graphApi.expandNode(menuState.nodeId, expansionMode, maxHsk);
      
      // Injetar NOVOS nós sem apagar os antigos
      const existingIds = nodesDataset.current.getIds();
      const nodesToAdd = data.nodes
        .filter(n => !existingIds.includes(n.id))
        .map(n => ({
          id: n.id, label: n.id, title: `HSK ${n.hsk} | ${n.pinyin}`,
          color: { background: n.hsk === 1 ? '#4361ee' : (n.hsk === 2 ? '#2a9d8f' : '#f4a261') }
        }));
      nodesDataset.current.add(nodesToAdd);

      // Injetar NOVAS arestas (molas) prevenindo duplicados
      const existingEdges = edgesDataset.current.get();
      const edgesToAdd = data.edges.filter(newEdge => {
        return !existingEdges.some(e => e.from === newEdge.from && e.to === newEdge.to);
      });
      edgesDataset.current.add(edgesToAdd);

    } catch (err) {
      console.error("Erro ao expandir nó:", err);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-50 outline-none">
      <div ref={containerRef} className="w-full h-full outline-none" />
      
      {menuState.visible && (
        <RadialMenu 
          position={{ x: menuState.x, y: menuState.y }} 
          nodeId={menuState.nodeId} 
          onExpand={handleExpand}
          onClose={() => setMenuState(prev => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}