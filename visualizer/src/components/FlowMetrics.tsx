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

import React, { useMemo } from 'react';

interface FlowMetricsProps {
  projectData: any;
  pipelineState: any;
}

export const FlowMetrics: React.FC<FlowMetricsProps> = ({ projectData, pipelineState }) => {
  const sleTargetDays = useMemo(() => {
    return pipelineState?.config?.kanban?.sle_target_days || 8;
  }, [pipelineState]);

  // 1. Ingest/mock Work Item Age
  const agingItems = useMemo(() => {
    const nodes = projectData?.graph?.nodes || [];
    const activeIssues = nodes.filter((n: any) => n.type === 'issue' && n.attributes?.status === 'Active');
    
    return activeIssues.map((node: any, idx: number) => {
      const ageDays = 3 + (idx % 7) + (idx * 0.8);
      return {
        id: node.id,
        title: node.name,
        ageDays: parseFloat(ageDays.toFixed(1)),
        assignee: node.attributes?.author || 'Alex',
        state: 'in_progress',
        exceeded: ageDays > sleTargetDays
      };
    }).sort((a: any, b: any) => b.ageDays - a.ageDays);
  }, [projectData, sleTargetDays]);

  // 2. Mock Scatterplot Completed Items Cycle Time
  const completedItems = useMemo(() => {
    return [
      { id: 'item-1', name: 'PR #190: Setup Redis Cache', date: '6/10', cycleTime: 4.5 },
      { id: 'item-2', name: 'Issue #48: Memory Leak Fix', date: '6/12', cycleTime: 12.0 },
      { id: 'item-3', name: 'PR #194: CI Pipeline Upgrades', date: '6/14', cycleTime: 2.1 },
      { id: 'item-4', name: 'PR #200: Add CORS Policy Config', date: '6/15', cycleTime: 6.8 },
      { id: 'item-5', name: 'Issue #52: Schema drift on profiles', date: '6/18', cycleTime: 3.5 },
      { id: 'item-6', name: 'PR #202: Lazy Load Dashboard Cards', date: '6/20', cycleTime: 5.0 },
      { id: 'item-7', name: 'Issue #55: Fix Nav Menu layout', date: '6/22', cycleTime: 9.2 }
    ];
  }, []);

  // 3. Mock Throughput
  const throughputData = useMemo(() => {
    return [
      { week: 'Wk 21', count: 3 },
      { week: 'Wk 22', count: 5 },
      { week: 'Wk 23', count: 4 },
      { week: 'Wk 24', count: 8 },
      { week: 'Wk 25', count: 6 }
    ];
  }, []);

  return (
    <div className="flow-metrics animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box', height: '100%', overflowY: 'auto' }}>
      <div>
        <h2 style={{ margin: 0 }}>Flow Metrics Dashboard</h2>
        <p className="tab-subtitle" style={{ margin: '4px 0 0 0' }}>
          Monitoring the four mandatory flow measures (WIP, Throughput, Work Item Age, Cycle Time) to identify bottlenecks.
        </p>
      </div>

      {/* Top row: 4 KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '15px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Work In Progress (WIP)</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--mono-font)', marginTop: '4px' }}>
            {agingItems.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>active</span>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '15px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Weekly Throughput</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--mono-font)', marginTop: '4px', color: 'var(--success)' }}>
            6.0 <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>items/wk</span>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '15px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Avg Work Item Age</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--mono-font)', marginTop: '4px' }}>
            5.4 <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>days</span>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '15px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Avg Cycle Time</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--mono-font)', marginTop: '4px' }}>
            6.1 <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>days</span>
          </div>
        </div>
      </div>

      {/* Visual Graphs Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Cumulative Flow Diagram (CFD) */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Work Status Flow (CFD)
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '0.95rem', color: 'var(--text-sub)', cursor: 'help' }}
                title="Visualizes how tasks accumulate across states over time. Widening bands point to operational bottlenecks."
              >
                help
              </span>
            </h3>
            <div style={{ height: '180px' }}>
              <svg viewBox="0 0 400 180" style={{ width: '100%', height: '100%' }}>
                {/* Stacked area paths */}
                {/* Backlog */}
                <path d="M 40 140 L 120 120 L 200 110 L 280 90 L 360 80 L 360 150 L 40 150 Z" fill="rgba(68, 80, 183, 0.15)" />
                <path d="M 40 140 L 120 120 L 200 110 L 280 90 L 360 80" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
                
                {/* In Progress */}
                <path d="M 40 110 L 120 90 L 200 80 L 280 65 L 360 50 L 360 80 L 40 140 Z" fill="rgba(132, 85, 239, 0.15)" />
                <path d="M 40 110 L 120 90 L 200 80 L 280 65 L 360 50" fill="none" stroke="var(--secondary)" strokeWidth="1.5" />

                {/* Review */}
                <path d="M 40 90 L 120 80 L 200 65 L 280 50 L 360 30 L 360 50 L 40 110 Z" fill="rgba(230, 95, 0, 0.15)" />
                <path d="M 40 90 L 120 80 L 200 65 L 280 50 L 360 30" fill="none" stroke="orange" strokeWidth="1.5" />

                {/* Done */}
                <path d="M 40 70 L 120 50 L 200 30 L 280 20 L 360 10 L 360 30 L 40 90 Z" fill="rgba(46, 160, 67, 0.15)" />
                <path d="M 40 70 L 120 50 L 200 30 L 280 20 L 360 10" fill="none" stroke="var(--success)" strokeWidth="1.5" />

                {/* Axes */}
                <line x1="40" y1="150" x2="360" y2="150" stroke="var(--text-main)" strokeWidth="1" />
                <line x1="40" y1="10" x2="40" y2="150" stroke="var(--text-main)" strokeWidth="1" />

                <text x="32" y="15" textAnchor="end" fontSize="9" fill="var(--text-sub)">30</text>
                <text x="32" y="85" textAnchor="end" fontSize="9" fill="var(--text-sub)">15</text>
                <text x="32" y="150" textAnchor="end" fontSize="9" fill="var(--text-sub)">0</text>

                <text x="40" y="165" textAnchor="middle" fontSize="9" fill="var(--text-sub)">Wk 21</text>
                <text x="200" y="165" textAnchor="middle" fontSize="9" fill="var(--text-sub)">Wk 23</text>
                <text x="360" y="165" textAnchor="middle" fontSize="9" fill="var(--text-sub)">Wk 25</text>
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', fontSize: '0.72rem' }}>
              <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px', marginRight: '4px' }}></span>Backlog</span>
              <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--secondary)', borderRadius: '2px', marginRight: '4px' }}></span>In Progress</span>
              <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'orange', borderRadius: '2px', marginRight: '4px' }}></span>Review</span>
              <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--success)', borderRadius: '2px', marginRight: '4px' }}></span>Done</span>
            </div>
          </div>

          {/* Cycle Time Scatterplot */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Task Completion Times
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '0.95rem', color: 'var(--text-sub)', cursor: 'help' }}
                title="Plots the total active days taken for each completed task. The red line represents our 8-day target."
              >
                help
              </span>
            </h3>
            <div style={{ height: '180px', position: 'relative' }}>
              <svg viewBox="0 0 400 180" style={{ width: '100%', height: '100%' }}>
                {/* SLE Target Line (85th percentile) */}
                <line x1="40" y1="68" x2="380" y2="68" stroke="var(--error)" strokeWidth="1.5" strokeDasharray="4,4" />
                <text x="375" y="60" textAnchor="end" fontSize="8" fill="var(--error)" fontWeight="700">85% SLE Target ({sleTargetDays} days)</text>

                {/* Grid lines */}
                <line x1="40" y1="120" x2="380" y2="120" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="40" y1="60" x2="380" y2="60" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Plot points */}
                {completedItems.map((item, idx) => {
                  const x = 50 + (idx * 45);
                  // Map cycle time (0 - 15 days) to y coordinate (150 down to 20)
                  const y = 150 - (item.cycleTime / 15) * 130;
                  const isExceeded = item.cycleTime > sleTargetDays;

                  return (
                    <g key={item.id} style={{ cursor: 'pointer' }}>
                      <circle 
                        cx={x} 
                        cy={y} 
                        r="5.5" 
                        fill={isExceeded ? 'var(--error)' : 'var(--success)'} 
                        stroke="var(--surface)" 
                        strokeWidth="1.5" 
                      />
                      <title>{item.name} ({item.cycleTime} days)</title>
                    </g>
                  );
                })}

                {/* Axes */}
                <line x1="40" y1="150" x2="380" y2="150" stroke="var(--text-main)" strokeWidth="1" />
                <line x1="40" y1="10" x2="40" y2="150" stroke="var(--text-main)" strokeWidth="1" />

                <text x="32" y="24" textAnchor="end" fontSize="9" fill="var(--text-sub)" fontFamily="var(--mono-font)">15d</text>
                <text x="32" y="84" textAnchor="end" fontSize="9" fill="var(--text-sub)" fontFamily="var(--mono-font)">8d</text>
                <text x="32" y="144" textAnchor="end" fontSize="9" fill="var(--text-sub)" fontFamily="var(--mono-font)">0d</text>

                <text x="40" y="165" textAnchor="middle" fontSize="9" fill="var(--text-sub)">6/10</text>
                <text x="210" y="165" textAnchor="middle" fontSize="9" fill="var(--text-sub)">6/16</text>
                <text x="380" y="165" textAnchor="middle" fontSize="9" fill="var(--text-sub)">6/22</text>
              </svg>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Work Item Age Chart */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '240px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Stuck Task Durations
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '0.95rem', color: 'var(--text-sub)', cursor: 'help' }}
                title="Shows how long open tasks have been lingering in their current state."
              >
                help
              </span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
              {agingItems.length > 0 ? (
                agingItems.map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }} className="truncate">{item.title}</span>
                      <span style={{ fontFamily: 'var(--mono-font)', fontWeight: 800, color: item.exceeded ? 'var(--error)' : 'var(--text-main)' }}>
                        {item.ageDays}d
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${Math.min(100, (item.ageDays / 12) * 100)}%`, 
                          background: item.exceeded ? 'var(--error)' : item.ageDays > sleTargetDays * 0.7 ? 'orange' : 'var(--primary)',
                          borderRadius: '4px'
                        }} 
                      />
                      {/* SLE line marker in the track */}
                      <div style={{ position: 'absolute', left: `${(sleTargetDays / 12) * 100}%`, top: 0, bottom: 0, width: '1.5px', background: 'var(--error)', opacity: 0.7 }} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-sub)', fontSize: '0.78rem' }}>
                  No items in progress
                </div>
              )}
            </div>
          </div>

          {/* Throughput Histogram */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Task Completion Velocity
              <span 
                className="material-symbols-outlined" 
                style={{ fontSize: '0.95rem', color: 'var(--text-sub)', cursor: 'help' }}
                title="Distribution of completed tasks per week. Measures consistency of team output."
              >
                help
              </span>
            </h3>
            <div style={{ height: '140px' }}>
              <svg viewBox="0 0 400 140" style={{ width: '100%', height: '100%' }}>
                {/* Horizontal grid lines */}
                <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="40" y1="70" x2="380" y2="70" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Bars */}
                {throughputData.map((data, idx) => {
                  const x = 70 + (idx * 60);
                  // Map completed count (0-10) to height (0-90)
                  const height = (data.count / 10) * 90;
                  const y = 110 - height;
                  
                  return (
                    <g key={idx}>
                      <rect x={x} y={y} width="24" height={height} rx="3" fill="var(--success)" opacity="0.8" />
                      <text x={x + 12} y={y - 6} textAnchor="middle" fontSize="9" fill="var(--text-sub)" fontFamily="var(--mono-font)">{data.count}</text>
                      <text x={x + 12} y="128" textAnchor="middle" fontSize="9" fill="var(--text-sub)">{data.week}</text>
                    </g>
                  );
                })}

                {/* X axis */}
                <line x1="40" y1="110" x2="380" y2="110" stroke="var(--text-main)" strokeWidth="1" />
              </svg>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
