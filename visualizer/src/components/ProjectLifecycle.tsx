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

interface ProjectLifecycleProps {
  projectData: any;
  pipelineState: any;
}

export const ProjectLifecycle: React.FC<ProjectLifecycleProps> = () => {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'epic-1': true,
    'epic-2': true
  });

  // Phases in English per request (translated from Finnish)
  const phases = useMemo(() => {
    return [
      { id: 'ideation', title: 'Ideation', status: 'completed' },
      { id: 'preparation', title: 'Preparation', status: 'completed' },
      { id: 'initiation', title: 'Initiation', status: 'completed' },
      { id: 'planning', title: 'Planning', status: 'completed' },
      { id: 'execution', title: 'Execution', status: 'active' },
      { id: 'closure', title: 'Closure', status: 'pending' },
      { id: 'support', title: 'Support', status: 'pending' }
    ];
  }, []);

  const toggleWbsNode = (id: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 1. WBS Tree Mock Data
  const wbsData = useMemo(() => {
    return [
      {
        id: 'epic-1',
        title: 'Core Authentication Suite Integration',
        hours: 120,
        status: 'in_progress',
        children: [
          {
            id: 'story-1.1',
            title: 'Design-system compliant login layout',
            hours: 40,
            status: 'completed',
            children: [
              { id: 'task-1.1.1', title: 'Sync CSS typography vars', hours: 16, status: 'completed' },
              { id: 'task-1.1.2', title: 'Fix flexbox wrapper margins', hours: 24, status: 'completed' }
            ]
          },
          {
            id: 'story-1.2',
            title: 'Redis session cache adapter middleware',
            hours: 80,
            status: 'in_progress',
            children: [
              { id: 'task-1.2.1', title: 'Handle connection timeouts', hours: 32, status: 'in_progress' },
              { id: 'task-1.2.2', title: 'Write unit tests for fallback logic', hours: 48, status: 'planned' }
            ]
          }
        ]
      },
      {
        id: 'epic-2',
        title: 'Telemetry Collection & Event Logging Pipeline',
        hours: 90,
        status: 'in_progress',
        children: [
          {
            id: 'story-2.1',
            title: 'BigQuery ingestion loader task',
            hours: 50,
            status: 'in_progress',
            children: [
              { id: 'task-2.1.1', title: 'Verify schema mapping columns', hours: 20, status: 'completed' },
              { id: 'task-2.1.2', title: 'Handle chunk loading failures', hours: 30, status: 'in_progress' }
            ]
          },
          {
            id: 'story-2.2',
            title: 'Merkle integrity chains generator',
            hours: 40,
            status: 'completed',
            children: [
              { id: 'task-2.2.1', title: 'Implement sha256 hashing solver', hours: 15, status: 'completed' },
              { id: 'task-2.2.2', title: 'Verify event appending logic', hours: 25, status: 'completed' }
            ]
          }
        ]
      }
    ];
  }, []);

  // 2. Risk Register mapped to 9 Knowledge Areas
  const riskRegister = useMemo(() => {
    return [
      { id: 'RSK-001', area: 'Scope Management', risk: 'Circular dependency loop in backlog', probability: 0.8, impact: 0.8, score: 0.64, mitigation: 'Review sprint hierarchy and decouple PR linkages.', status: 'open' },
      { id: 'RSK-002', area: 'Schedule Management', risk: 'Sprint slippage on auth middleware', probability: 0.6, impact: 0.9, score: 0.54, mitigation: 'Pair program Redis adapter to secure scheduled release.', status: 'open' },
      { id: 'RSK-003', area: 'Quality Management', risk: 'CSS styling token regressions', probability: 0.7, impact: 0.7, score: 0.49, mitigation: 'Automated layout tests on staging before merging code.', status: 'mitigated' },
      { id: 'RSK-004', area: 'Resource Management', risk: 'Resource overload on lead developers', probability: 0.5, impact: 0.8, score: 0.40, mitigation: 'Delegate review tasks to senior developers.', status: 'open' },
      { id: 'RSK-005', area: 'Integration Management', risk: 'Telemetry schema mismatch in ingestion', probability: 0.9, impact: 0.4, score: 0.36, mitigation: 'Pre-check logs structure before uploading to BigQuery.', status: 'mitigated' }
    ];
  }, []);

  // WBS Recursive Renderer
  const renderWbsItem = (item: any, depth = 0) => {
    const isExpanded = expandedNodes[item.id];
    const hasChildren = item.children && item.children.length > 0;
    
    return (
      <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div 
          onClick={() => hasChildren && toggleWbsNode(item.id)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            padding: '8px 12px', 
            borderRadius: '8px',
            background: depth === 0 ? 'var(--surface-dim)' : 'none',
            borderBottom: '1px solid var(--border)',
            cursor: hasChildren ? 'pointer' : 'default',
            marginLeft: `${depth * 20}px`
          }}
        >
          {hasChildren ? (
            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: 'var(--text-sub)' }}>
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '1.0rem', color: 'var(--text-sub)', marginLeft: '4px' }}>
              subdirectory_arrow_right
            </span>
          )}
          
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ fontSize: depth === 0 ? '0.85rem' : '0.8rem', color: 'var(--text-main)' }}>{item.title}</strong>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', marginLeft: '10px' }}>({item.hours}h)</span>
            </div>
            <span 
              className={`status-pill ${item.status}`} 
              style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: '4px', textTransform: 'capitalize' }}
            >
              {item.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {item.children.map((child: any) => renderWbsItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="project-lifecycle animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', height: '100%', overflowY: 'auto' }}>
      
      {/* 1. Horizontal Timeline */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '0.9rem' }}>Project Lifecycle Stage Gate Timeline</h3>
        
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', margin: '20px 0' }}>
          
          {/* Horizontal connecting track line */}
          <div style={{ position: 'absolute', left: '40px', right: '40px', height: '3px', background: 'var(--border)', zIndex: 1 }} />
          
          {phases.map((phase, idx) => {
            const isActive = phase.status === 'active';
            const isCompleted = phase.status === 'completed';
            
            let color = 'var(--border)';
            if (isCompleted) color = 'var(--success)';
            else if (isActive) color = 'var(--primary)';
            
            return (
              <div 
                key={phase.id} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  zIndex: 2, 
                  position: 'relative', 
                  width: '70px',
                  textAlign: 'center'
                }}
              >
                <div 
                  style={{ 
                    width: isActive ? '28px' : '22px', 
                    height: isActive ? '28px' : '22px', 
                    borderRadius: '50%', 
                    background: isCompleted ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--surface)', 
                    border: `3px solid ${color}`,
                    boxShadow: isActive ? '0 0 12px var(--primary-glow)' : 'none',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: isCompleted ? 'white' : isActive ? 'white' : 'var(--text-sub)',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  {isCompleted ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>check</span>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span 
                  style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: isActive ? 800 : isCompleted ? 700 : 500, 
                    color: isActive ? 'var(--primary)' : 'var(--text-main)', 
                    marginTop: '8px' 
                  }}
                >
                  {phase.title}
                </span>
                {isActive && (
                  <span style={{ fontSize: '0.62rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '3px', marginTop: '2px', fontWeight: 800 }}>
                    ACTIVE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left: Work Breakdown Structure (WBS) Tree */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem' }}>Work Breakdown Structure (WBS)</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', background: 'var(--border)', padding: '2px 8px', borderRadius: '10px' }}>
              Total: 210 hours
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
            {wbsData.map(epic => renderWbsItem(epic))}
          </div>
        </div>

        {/* Right: Risk Register mapped to 9 Knowledge Areas */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '400px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem' }}>Project Risk Register (PMBOK 9 Areas)</h3>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-sub)' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 800 }}>ID</th>
                  <th style={{ padding: '6px 8px', fontWeight: 800 }}>Knowledge Area</th>
                  <th style={{ padding: '6px 8px', fontWeight: 800 }}>Risk Description</th>
                  <th style={{ padding: '6px 8px', fontWeight: 800 }}>Score</th>
                  <th style={{ padding: '6px 8px', fontWeight: 800 }}>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {riskRegister.map((risk) => {
                  const scoreColor = risk.score > 0.6 ? 'var(--error)' : risk.score > 0.4 ? 'orange' : 'var(--success)';
                  return (
                    <tr key={risk.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 700 }}>{risk.id}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--primary)', fontWeight: 600 }}>{risk.area}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{risk.risk}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 800, color: scoreColor }}>{risk.score}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--text-sub)', lineHeight: 1.35 }}>{risk.mitigation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
