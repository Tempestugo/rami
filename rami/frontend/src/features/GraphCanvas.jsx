import React, { useEffect, useRef, useCallback } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import useStore from '../store/useStore';
import { graphApi } from '../services/api';
import RadialMenu from '../components/RadialMenu';

// HSK level → node color
const HSK_NODE_COLORS = {
  1: { bg: '#1d4ed8', border: '#3b82f6', font: '#e0f2fe' },
  2: { bg: '#065f46', border: '#10b981', font: '#d1fae5' },
  3: { bg: '#92400e', border: '#f59e0b', font: '#fef3c7' },
  4: { bg: '#7f1d1d', border: '#ef4444', font: '#fee2e2' },
  5: { bg: '#6b21a8', border: '#a855f7', font: '#f3e8ff' },
  6: { bg: '#831843', border: '#ec4899', font: '#fce7f3' },
};

const VIS_OPTIONS = {
  nodes: {
    shape: 'dot',
    size: 26,
    font: {
      face: 'Noto Serif SC, serif',
      size: 18,
      color: '#f5f5f4',
      bold: { color: '#ffffff' },
    },
    borderWidth: 2,
    shadow: { enabled: true, size: 8, color: 'rgba(0,0,0,0.4)' },
    chosen: {
      node: (values) => {
        values.size = 34;
        values.borderWidth = 3;
        values.shadowSize = 14;
      }
    }
  },
  edges: {
    arrows: { to: { enabled: true, scaleFactor: 0.6 } },
    color: { color: 'rgba(255,255,255,0.12)', highlight: 'rgba(255,255,255,0.4)' },
    width: 1,
    smooth: { type: 'curvedCW', roundness: 0.1 },
  },
  physics: {
    barnesHut: {
      gravitationalConstant: -5000,
      centralGravity: 0.2,
      springLength: 120,
      springConstant: 0.04,
      damping: 0.2,
    },
    stabilization: { iterations: 250 },
  },
  interaction: {
    hover: true,
    tooltipDelay: 200,
    navigationButtons: false,
  },
  layout: { randomSeed: 42 },
};

export default function GraphCanvas() {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDS = useRef(new DataSet());
  const edgesDS = useRef(new DataSet());

  const { mode, maxHsk, context, setActiveChar, togglePhraseSelection, phraseSelection } = useStore();

  // Radial menu state
  const [radialMenu, setRadialMenu] = React.useState(null); // { nodeId, x, y }

  // Build vis-network nodes with appropriate styling
  const buildVisNode = useCallback((n) => {
    const color = HSK_NODE_COLORS[n.hsk] || HSK_NODE_COLORS[6];
    const isSelected = phraseSelection.includes(n.id);
    return {
      id: n.id,
      label: n.id,
      title: `HSK ${n.hsk} | ${n.pinyin} | ${n.meaning}`,
      color: {
        background: isSelected ? '#92400e' : color.bg,
        border: isSelected ? '#fcd34d' : color.border,
        highlight: { background: color.border, border: '#ffffff' },
        hover: { background: color.border, border: '#ffffff' },
      },
      font: { color: color.font },
    };
  }, [phraseSelection]);

  // Fetch and render graph
  const loadGraph = useCallback(async () => {
    try {
      const { nodes, edges } = await graphApi.getGraph({ maxHsk, context, mode });
      nodesDS.current.clear();
      edgesDS.current.clear();
      nodesDS.current.add(nodes.map(buildVisNode));
      edgesDS.current.add(edges);
      setTimeout(() => {
        networkRef.current?.fit({ animation: { duration: 700, easingFunction: 'easeInOutQuad' } });
      }, 300);
    } catch (err) {
      console.error('Failed to load graph:', err);
    }
  }, [maxHsk, context, mode, buildVisNode]);

  // Initialize network once
  useEffect(() => {
    if (!containerRef.current) return;
    const network = new Network(
      containerRef.current,
      { nodes: nodesDS.current, edges: edgesDS.current },
      VIS_OPTIONS
    );
    networkRef.current = network;

    // Node click: show details + radial menu
    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        graphApi.getCharacter(nodeId).then(char => {
          setActiveChar(char);
        });

        // Position radial menu at canvas coordinates
        const domPos = params.pointer.DOM;
        setRadialMenu({ nodeId, x: domPos.x, y: domPos.y });
      } else {
        setRadialMenu(null);
      }
    });

    // Drag clears menu
    network.on('dragging', () => setRadialMenu(null));
    network.on('zoom', () => setRadialMenu(null));

    return () => network.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload graph on filter change
  useEffect(() => {
    loadGraph();
    setRadialMenu(null);
  }, [loadGraph]);

  // Update node colors when selection changes
  useEffect(() => {
    const updates = nodesDS.current.get().map(n => {
      const color = HSK_NODE_COLORS[n._hsk] || HSK_NODE_COLORS[1];
      const isSelected = phraseSelection.includes(n.id);
      return {
        id: n.id,
        color: {
          background: isSelected ? '#92400e' : color.bg,
          border: isSelected ? '#fcd34d' : color.border,
        }
      };
    });
    if (updates.length) nodesDS.current.update(updates);
  }, [phraseSelection]);

  const handleSelectForPhrase = (nodeId) => {
    togglePhraseSelection(nodeId);
    setRadialMenu(null);
  };

  return (
    <div className="flex-1 relative overflow-hidden bg-ink-950">
      <div
        id="network-canvas"
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Radial menu overlay */}
      {radialMenu && (
        <RadialMenu
          nodeId={radialMenu.nodeId}
          x={radialMenu.x}
          y={radialMenu.y}
          onClose={() => setRadialMenu(null)}
          onSelectForPhrase={handleSelectForPhrase}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
        {Object.entries(HSK_NODE_COLORS).map(([level, c]) => (
          <div key={level} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full border" style={{ background: c.bg, borderColor: c.border }} />
            <span className="text-xs text-ink-500 font-mono">HSK {level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
