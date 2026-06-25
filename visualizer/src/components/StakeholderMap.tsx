// Copyright 2026 Petri Paananen
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useState, useMemo } from 'react';

interface StakeholderMapProps {
  projectData: any;
  pipelineState: any;
}

interface StakeholderNode {
  id: string;
  name: string;
  role: string;
  influence: 'high' | 'medium' | 'low';
  activityCount: number;
  daysSinceLastActivity: number;
  assignedAreas: string[];
  health: 'healthy' | 'at_risk' | 'critical';
  x: number;
  y: number;
}

export const StakeholderMap: React.FC<StakeholderMapProps> = (props) => {
  const { projectData } = props;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Ingest or mock stakeholders
  const stakeholders = useMemo(() => {
    // If the pipelineState has stakeholder analysis, we can extract from there.
    // Otherwise we'll mock based on nodes in the project graph (authors)
    
    // Core project team
    const team: StakeholderNode[] = [
      { id: 'st-alex', name: 'Alex (Product Owner)', role: 'Product Owner', influence: 'high', activityCount: 15, daysSinceLastActivity: 0.2, assignedAreas: ['Requirements', 'Scope'], health: 'healthy', x: 200, y: 120 },
      { id: 'st-mikael', name: 'Mikael (Lead Dev)', role: 'Lead Developer', influence: 'high', activityCount: 32, daysSinceLastActivity: 0.1, assignedAreas: ['Backend API', 'Caching'], health: 'healthy', x: 120, y: 220 },
      { id: 'st-elena', name: 'Elena (QA Eng)', role: 'QA Engineer', influence: 'medium', activityCount: 18, daysSinceLastActivity: 0.5, assignedAreas: ['CI/CD', 'Authentication'], health: 'healthy', x: 280, y: 220 },
      { id: 'st-lara', name: 'Lara (UI Designer)', role: 'UI/UX Designer', influence: 'medium', activityCount: 12, daysSinceLastActivity: 6.2, assignedAreas: ['Design Tokens', 'Frontend'], health: 'critical', x: 120, y: 320 },
      { id: 'st-dan', name: 'Dan (Developer)', role: 'Frontend Dev', influence: 'low', activityCount: 22, daysSinceLastActivity: 1.4, assignedAreas: ['Navigation Bar', 'Accessibility'], health: 'at_risk', x: 280, y: 320 },
      { id: 'st-sarah', name: 'Sarah (Sponsor)', role: 'Project Sponsor', influence: 'high', activityCount: 4, daysSinceLastActivity: 4.5, assignedAreas: ['Budget', 'Approvals'], health: 'healthy', x: 200, y: 40 }
    ];

    // Align coordinates with graph size
    return team;
  }, [projectData]);

  // Stakeholder communication link definitions
  const links = useMemo(() => {
    return [
      { source: 'st-sarah', target: 'st-alex', weight: 3 },
      { source: 'st-alex', target: 'st-mikael', weight: 5 },
      { source: 'st-alex', target: 'st-elena', weight: 4 },
      { source: 'st-mikael', target: 'st-elena', weight: 5 },
      { source: 'st-mikael', target: 'st-lara', weight: 2 },
      { source: 'st-lara', target: 'st-dan', weight: 1 },
      { source: 'st-dan', target: 'st-elena', weight: 3 }
    ];
  }, []);

  const selectedNode = useMemo(() => {
    return stakeholders.find(s => s.id === selectedNodeId) || stakeholders[0];
  }, [stakeholders, selectedNodeId]);

  const risks = useMemo(() => {
    const list: any[] = [];
    stakeholders.forEach(s => {
      if (s.daysSinceLastActivity > 5.0) {
        list.push({
          name: s.name,
          risk: 'Inactive Contributor',
          severity: 'critical',
          desc: `${s.name} has had no system activity in ${s.daysSinceLastActivity.toFixed(1)} days. Potential bottleneck for ${s.assignedAreas.join(', ')}.`
        });
      } else if (s.daysSinceLastActivity > 1.0 && s.health === 'at_risk') {
        list.push({
          name: s.name,
          risk: 'Delayed Delivery Block',
          severity: 'warning',
          desc: `${s.name} has pending reviews on accessibility changes. Potential release pipeline block.`
        });
      }

      if (s.activityCount > 30) {
        list.push({
          name: s.name,
          risk: 'Resource Overload Warning',
          severity: 'warning',
          desc: `${s.name} handles excessive share of sprint deliverables (${s.activityCount} actions). Susceptible to burn-out.`
        });
      }
    });
    return list;
  }, [stakeholders]);

  // RACI Matrix definition
  const raciData = useMemo(() => {
    return [
      { area: 'Authentication Package', R: 'Mikael', A: 'Alex', C: 'Elena', I: 'Sarah' },
      { area: 'UI Design System', R: 'Lara', A: 'Alex', C: 'Dan', I: 'Mikael' },
      { area: 'Performance (Caching)', R: 'Mikael', A: 'Alex', C: 'Elena', I: 'Sarah' },
      { area: 'CI/CD Pipeline', R: 'Elena', A: 'Mikael', C: 'Alex', I: 'Sarah' },
      { area: 'Layout Accessibility', R: 'Dan', A: 'Alex', C: 'Lara', I: 'Elena' }
    ];
  }, []);

  return (
    <div className="stakeholder-map animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', height: '100%', overflowY: 'auto' }}>
      <div>
        <h2 style={{ margin: 0 }}>Stakeholder Ecosystem Map</h2>
        <p className="tab-subtitle" style={{ margin: '4px 0 0 0' }}>
          Mapping project stakeholders, communication patterns, and engagement risks.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Left: SVG Network Graph */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '480px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Communication Network</h3>
          <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--surface-dim)', position: 'relative', overflow: 'hidden' }}>
            <svg viewBox="0 0 400 380" style={{ width: '100%', height: '100%' }}>
              {/* Edges */}
              {links.map((link, idx) => {
                const sourceNode = stakeholders.find(s => s.id === link.source);
                const targetNode = stakeholders.find(s => s.id === link.target);
                if (!sourceNode || !targetNode) return null;
                return (
                  <line 
                    key={idx}
                    x1={sourceNode.x} 
                    y1={sourceNode.y} 
                    x2={targetNode.x} 
                    y2={targetNode.y} 
                    stroke="var(--primary)" 
                    strokeWidth={link.weight * 0.7} 
                    opacity="0.25" 
                  />
                );
              })}

              {/* Nodes */}
              {stakeholders.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const nodeSize = 10 + (node.activityCount * 0.3); // size proportional to activity
                
                let fill = 'var(--success)';
                if (node.health === 'critical') fill = 'var(--error)';
                else if (node.health === 'at_risk') fill = 'orange';

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${node.x}, ${node.y})`} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    {isSelected && (
                      <circle r={nodeSize + 6} fill={fill} opacity="0.15" className="node-glow" />
                    )}
                    <circle 
                      r={nodeSize} 
                      fill={fill} 
                      stroke={isSelected ? 'var(--text-main)' : 'var(--surface)'} 
                      strokeWidth={isSelected ? 2 : 1.5} 
                    />
                    <text 
                      y={nodeSize + 14} 
                      textAnchor="middle" 
                      fontSize="9" 
                      fontWeight={isSelected ? 800 : 600}
                      fill="var(--text-main)"
                    >
                      {node.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Float Legend */}
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.65rem', background: 'var(--surface)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span> Active contributor
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'orange' }}></span> Inactive/At-Risk
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--error)' }}></span> Siloed / Blocker
              </div>
            </div>
          </div>
        </div>

        {/* Right: Selected Stakeholder Detail & Risks list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Detailed Info */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>Stakeholder Profiler</h3>
            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>{selectedNode.name}</h4>
                  <span className={`status-pill ${selectedNode.health}`} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                    {selectedNode.health}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--surface-dim)', padding: '12px', borderRadius: '10px', fontSize: '0.78rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Project Role</span>
                    <strong>{selectedNode.role}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Influence Level</span>
                    <strong style={{ textTransform: 'capitalize' }}>{selectedNode.influence}</strong>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Sprint Activities</span>
                    <strong>{selectedNode.activityCount} actions</strong>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Last System Sync</span>
                    <strong>{selectedNode.daysSinceLastActivity.toFixed(1)}d ago</strong>
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.72rem', marginBottom: '4px' }}>Ownership Areas</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedNode.assignedAreas.map((area, i) => (
                      <span key={i} style={{ background: 'var(--border)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', margin: 0 }}>Select a node in the graph to inspect details.</p>
            )}
          </div>

          {/* Risks list */}
          <div className="glass-card" style={{ padding: '20px', flex: 1 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Stakeholder Risks</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
              {risks.map((risk, i) => (
                <div 
                  key={i} 
                  style={{ 
                    border: `1px solid ${risk.severity === 'critical' ? 'rgba(186, 26, 26, 0.2)' : 'rgba(230, 95, 0, 0.2)'}`, 
                    background: risk.severity === 'critical' ? 'rgba(186, 26, 26, 0.04)' : 'rgba(230, 95, 0, 0.04)', 
                    borderRadius: '8px', 
                    padding: '8px 12px',
                    fontSize: '0.75rem' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <strong style={{ color: risk.severity === 'critical' ? 'var(--error)' : '#e65f00' }}>{risk.risk}</strong>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-sub)' }}>{risk.name.split(' ')[0]}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-sub)', lineHeight: 1.35 }}>{risk.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* RACI Matrix section */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Responsibility Assignment Matrix (RACI)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px', fontWeight: 800 }}>Deliverable Area</th>
              <th style={{ padding: '8px 12px', fontWeight: 800 }}>Responsible (R)</th>
              <th style={{ padding: '8px 12px', fontWeight: 800 }}>Accountable (A)</th>
              <th style={{ padding: '8px 12px', fontWeight: 800 }}>Consulted (C)</th>
              <th style={{ padding: '8px 12px', fontWeight: 800 }}>Informed (I)</th>
            </tr>
          </thead>
          <tbody>
            {raciData.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: idx < raciData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>{row.area}</td>
                <td style={{ padding: '8px 12px' }}>{row.R}</td>
                <td style={{ padding: '8px 12px' }}>{row.A}</td>
                <td style={{ padding: '8px 12px' }}>{row.C}</td>
                <td style={{ padding: '8px 12px' }}>{row.I}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
