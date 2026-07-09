import { useState, useMemo } from 'react';
import type { HoveredData } from './DataTree';
import { DataTreeGardenBabylon } from './DataTreeGardenBabylon';

interface DataTreeGardenProps {
  graph: any;
  crr?: number;
  projectName?: string;
  uiVisible?: boolean;
  [key: string]: any;
}

export function DataTreeGarden({
  graph,
  crr,
  projectName,
  uiVisible = true,
}: DataTreeGardenProps) {
  const [hoveredInfo, setHoveredInfo] = useState<HoveredData | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  const currentCrr = crr ?? 1.25;

  const theme = useMemo(() => {
    const name = (projectName || '').toLowerCase();
    if (name.includes('alpha')) return 'alpha';
    if (name.includes('beta')) return 'beta';
    if (name.includes('gamma')) return 'gamma';
    return 'default';
  }, [projectName]);

  const skyBackground = useMemo(() => {
    if (theme === 'alpha') return 'linear-gradient(to top, #e74c3c, #feb47b)'; // Deep sunset
    if (theme === 'beta') return 'linear-gradient(to top, #fbc2eb, #a1c4fd)'; // Pink sunrise
    if (theme === 'gamma') return 'linear-gradient(to top, #5c6b73, #2f4f4f)'; // Overcast stormy grey
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
        graph={graph}
        crr={currentCrr}
        projectName={projectName}
        onHover={setHoveredInfo}
      />

      {/* Floating Hover Details Card Overlay */}
      {hoveredInfo && uiVisible && (
        <div
          className="glass-card item-hover-card"
          style={{
            position: 'absolute',
            left: hoveredInfo.x + 15,
            top: hoveredInfo.y + 15,
            zIndex: 1000,
            pointerEvents: 'none',
            background: 'rgba(23, 28, 41, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            padding: '12px 14px',
            color: '#fff',
            minWidth: '220px',
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

      {/* 📖 DTO Garden Legend Panel */}
      {showLegend && (
        <div
          className="glass-card legend-panel"
          style={{
            position: 'absolute',
            left: 20,
            top: 140, // Below workspace overview card
            width: 320,
            maxHeight: 'calc(100% - 240px)',
            overflowY: 'auto',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: 'rgba(23, 28, 41, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>📖 DTO Garden Legend</h3>
            <button
              onClick={() => setShowLegend(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 18,
                cursor: 'pointer',
                padding: '0 4px',
              }}
            >
              &times;
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, lineHeight: '1.4' }}>
            <div>
              <strong style={{ color: '#e67e22', display: 'block', marginBottom: 2 }}>🌳 Epic Trees (Epics)</strong>
              <span>Represents Project Epics. Height and leaf growth reflect progress. Gnarled trunk rotation reflects risk/complexity. Fruits are deliverables.</span>
            </div>
            <div>
              <strong style={{ color: '#2ecc71', display: 'block', marginBottom: 2 }}>🌹 Rose Bushes (Pull Requests)</strong>
              <span>Represents Pull Requests (PRs). Green for Completed, Yellow for Under Review, Grey for Draft. Active PRs sprout flowers.</span>
            </div>
            <div>
              <strong style={{ color: '#e74c3c', display: 'block', marginBottom: 2 }}>🌿 Leafy Weeds (Issues/Bugs)</strong>
              <span>Represents Jira/Linear Issues. Red clumps are active high-priority bugs/tasks; dry grey clumps reside in the backlog.</span>
            </div>
            <div>
              <strong style={{ color: '#f1c40f', display: 'block', marginBottom: 2 }}>💧 Stone Well (Main Repository)</strong>
              <span>Represents the central repo & main branch. The well water's health reflects the overall workspace code integration stability.</span>
            </div>
            <div>
              <strong style={{ color: '#3498db', display: 'block', marginBottom: 2 }}>🧙 Garden Gnomes (AI Agents)</strong>
              <span>Operational AI Agents (Worker, Critic, Opponent) executing tasks, running pipeline checks, and testing system stability.</span>
            </div>
            <div>
              <strong style={{ color: '#e67e22', display: 'block', marginBottom: 2 }}>📦 Crop Crates (Deliverables)</strong>
              <span>Represents completed milestones or merged packages ready for deployment.</span>
            </div>
            <div>
              <strong style={{ color: '#95a5a6', display: 'block', marginBottom: 2 }}>🛢️ Wooden Barrels (Builds)</strong>
              <span>Represents generated build artifacts, packages, or container images in the CI pipeline.</span>
            </div>
            <div>
              <strong style={{ color: '#948c82', display: 'block', marginBottom: 2 }}>🛤️ Stepping Stones (CI/CD Path)</strong>
              <span>Represents the commit history path and CI/CD stages leading into the central branch.</span>
            </div>
            <div>
              <strong style={{ color: '#8e4a23', display: 'block', marginBottom: 2 }}>💮 Wildflowers (Dependencies)</strong>
              <span>The 5-circle objects scattered outside the fence represent external open-source libraries and package imports.</span>
            </div>
            <div>
              <strong style={{ color: '#7cd936', display: 'block', marginBottom: 2 }}>🚧 Fences (Workspace Scope)</strong>
              <span>Fences define active branch boundaries. Grass outside represents untracked files or third-party scopes.</span>
            </div>
            <div>
              <strong style={{ color: '#34495e', display: 'block', marginBottom: 2 }}>⛈️ Weather (Pipeline Load)</strong>
              <span>Sunny weather represents clean integration. High technical debt or failing tests trigger overcast skies and rain.</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!showLegend && uiVisible && (
        <button
          onClick={() => setShowLegend(true)}
          style={{
            position: 'absolute',
            left: 20,
            bottom: 20,
            zIndex: 1000,
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
