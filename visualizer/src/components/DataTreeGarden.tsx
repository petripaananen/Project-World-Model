import { useState, useMemo } from 'react';
import type { HoveredData } from './DataTree';
import { DataTreeGardenBabylon } from './DataTreeGardenBabylon';

interface DataTreeGardenProps {
  graph: any;
  crr?: number;
  projectName?: string;
  filters?: Record<string, boolean>;
  uiVisible?: boolean;
  [key: string]: any;
}

export function DataTreeGarden({
  graph,
  crr,
  projectName,
  filters,
  uiVisible = true,
}: DataTreeGardenProps) {
  const [hoveredInfo, setHoveredInfo] = useState<HoveredData | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  const currentCrr = crr ?? 1.25;

  const theme = useMemo(() => {
    const name = (projectName || '').toLowerCase();
    if (name.includes('alpha')) return 'alpha';
    if (name.includes('beta')) return 'beta';
    if (name.includes('gamma')) return 'gamma';
    return 'default';
  }, [projectName]);

  const skyBackground = useMemo(() => {
    if (theme === 'alpha') return 'linear-gradient(to top, #a1c4fd, #c2e9fb)'; // Bright clear blue daylight sky
    if (theme === 'beta') return 'linear-gradient(to top, #e0c3fc, #8ec5fc)'; // Soft morning blue-pink sky
    if (theme === 'gamma') return 'linear-gradient(to top, #a3bded, #c4e0e5)'; // Bright overcast soft grey-blue sky
    return 'linear-gradient(to top, #fff3d1, #a1c4fd)'; // Soft spring daylight
  }, [theme]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: skyBackground,
        overflow: 'hidden',
      }}
    >
      {/* 3D Babylon.js Viewport */}
      <DataTreeGardenBabylon
        key={projectName}
        graph={graph}
        crr={currentCrr}
        projectName={projectName}
        filters={filters}
        onHover={setHoveredInfo}
      />

      {/* Floating Hover Details Card Overlay */}
      {hoveredInfo && uiVisible && (
        <div
          className="glass-card item-hover-card"
          style={{
            position: 'absolute',
            left: Math.min(hoveredInfo.x + 15, window.innerWidth - 300),
            top: Math.min(hoveredInfo.y + 15, window.innerHeight - 220),
            zIndex: 1000,
            pointerEvents: 'none',
            background: 'rgba(23, 28, 41, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#fff',
            width: '260px',
            maxWidth: '280px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            textAlign: 'left',
          }}
        >
          {/* Garden Element Type Tag */}
          <div
            style={{
              color: hoveredInfo.node.elementType === 'Leafy Weed' ? '#ff4d4d' :
                     hoveredInfo.node.elementType === 'Rose Bush' ? '#2ecc71' :
                     hoveredInfo.node.elementType === 'Epic Tree' ? '#3498db' :
                     hoveredInfo.node.elementType === 'Stone Well' ? '#f1c40f' : '#e67e22',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {hoveredInfo.node.elementType === 'Leafy Weed' ? '🌿 Leafy Weed (Issue)' :
             hoveredInfo.node.elementType === 'Rose Bush' ? '🌹 Rose Bush (PR)' :
             hoveredInfo.node.elementType === 'Epic Tree' ? '🌳 Epic Tree (Epic)' :
             hoveredInfo.node.elementType === 'Stone Well' ? '💧 Stone Well (Repository)' :
             hoveredInfo.node.elementType === 'Garden Gnome' ? '🧙 Garden Gnome (AI Agent)' : '💮 Garden Element'}
          </div>

          <div className="hover-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: '#fff', lineHeight: '1.3' }}>
              <strong>{hoveredInfo.node.title}</strong>
            </h4>
            {hoveredInfo.node.id !== 'well-core' &&
              !hoveredInfo.node.id.startsWith('gnome-') && (
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: '3px', color: '#ccc', whiteSpace: 'nowrap' }}>
                  {hoveredInfo.node.id}
                </span>
              )}
          </div>
          <div className="hover-body">
            {hoveredInfo.node.description ? (
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.4', color: '#ddd' }}>{hoveredInfo.node.description}</p>
            ) : (
              <div className="hover-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#aaa' }}>Progress:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                    <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(hoveredInfo.node.progress ?? 0) * 100}%`,
                          height: '100%',
                          background: (hoveredInfo.node.progress ?? 0) > 0.8 ? '#2ecc71' : (hoveredInfo.node.progress ?? 0) > 0.4 ? '#f1c40f' : '#e74c3c'
                        }}
                      ></div>
                    </div>
                    <span style={{ fontWeight: 600, minWidth: '30px', textAlign: 'right' }}>
                      {Math.round((hoveredInfo.node.progress ?? 0) * 100)}%
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#aaa' }}>Complexity:</span>
                  <span style={{ fontWeight: 600, background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '3px' }}>
                    {hoveredInfo.node.complexity?.toFixed(2) ?? '0.00'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#aaa' }}>Risk Factor:</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: (hoveredInfo.node.risk ?? 0) > 0.5 ? '#ff4d4d' : '#2ecc71',
                      background: (hoveredInfo.node.risk ?? 0) > 0.5 ? 'rgba(255,77,77,0.15)' : 'rgba(46,204,113,0.15)',
                      padding: '1px 5px',
                      borderRadius: '3px'
                    }}
                  >
                    {hoveredInfo.node.risk?.toFixed(2) ?? '0.00'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 📖 DTO Garden Legend Panel (Always Open, Scroll-Free Grid) */}
      {showLegend && uiVisible && (
        <div
          className="glass-card legend-panel"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 20,
            bottom: 20,
            width: 380,
            zIndex: 1001,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '12px 14px',
            background: 'rgba(18, 22, 34, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 12,
            backdropFilter: 'blur(12px)',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: 6 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.4px', color: '#e0e6ed' }}>
              📖 DTO GARDEN LEGEND
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); setShowLegend(false); }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 16,
                cursor: 'pointer',
                padding: '2px 6px',
                lineHeight: 1,
                borderRadius: 4,
              }}
              title="Hide Legend"
            >
              &times;
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11, lineHeight: '1.3' }}>
            <div>
              <strong style={{ color: '#f1c40f', display: 'block' }}>💧 Stone Well</strong>
              <span style={{ color: '#bbb' }}>Repository core & main branch.</span>
            </div>
            <div>
              <strong style={{ color: '#2ecc71', display: 'block' }}>🌳 Epic Trees</strong>
              <span style={{ color: '#bbb' }}>Low-poly trees with subtask sockets.</span>
            </div>
            <div>
              <strong style={{ color: '#e67e22', display: 'block' }}>🌹 PR Flower Beds</strong>
              <span style={{ color: '#bbb' }}>PR status (Green=Merged, Yellow=Review).</span>
            </div>
            <div>
              <strong style={{ color: '#e74c3c', display: 'block' }}>🪨 Tech Debt Rocks</strong>
              <span style={{ color: '#bbb' }}>Active or blocked issue bugs.</span>
            </div>
            <div>
              <strong style={{ color: '#3498db', display: 'block' }}>🧙 Agent Statues</strong>
              <span style={{ color: '#bbb' }}>Worker, Critic & Opponent agents.</span>
            </div>
            <div>
              <strong style={{ color: '#f39c12', display: 'block' }}>💡 Active Lamps</strong>
              <span style={{ color: '#bbb' }}>In-progress active work glow.</span>
            </div>
            <div>
              <strong style={{ color: '#9b59b6', display: 'block' }}>💮 Scatter Flowers</strong>
              <span style={{ color: '#bbb' }}>Pots & flowers for dependencies.</span>
            </div>
            <div>
              <strong style={{ color: '#95a5a6', display: 'block' }}>🪵 Garden Pillars</strong>
              <span style={{ color: '#bbb' }}>Sprint boundary perimeter.</span>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <strong style={{ color: '#34495e', display: 'inline', marginRight: 4 }}>⛈️ Weather:</strong>
              <span style={{ color: '#bbb' }}>Sunny = clean integration; Rain/fog = debt load warning.</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!showLegend && uiVisible && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowLegend(true); }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: 20,
            bottom: 20,
            zIndex: 1000,
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'rgba(23, 28, 41, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            backdropFilter: 'blur(5px)',
            color: '#fff',
            fontWeight: 500,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
          }}
        >
          📖 DTO Glossary
        </button>
      )}
    </div>
  );
}
