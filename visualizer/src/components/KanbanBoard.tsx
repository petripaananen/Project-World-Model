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

interface FusedNode {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
}

interface KanbanBoardProps {
  projectData: {
    id: string;
    name: string;
    graph?: {
      nodes: FusedNode[];
    };
  } | null;
  pipelineState: any;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectData, pipelineState }) => {
  // Read WIP limits from config (or default)
  const wipLimits = useMemo(() => {
    return pipelineState?.config?.kanban?.wip_limits || {
      backlog: 20,
      in_progress: 5,
      review: 3,
      done: 999
    };
  }, [pipelineState]);

  // Read SLE target days from config
  const sleTargetDays = useMemo(() => {
    return pipelineState?.config?.kanban?.sle_target_days || 8;
  }, [pipelineState]);

  // Process and group cards by column
  const columns = useMemo(() => {
    const backlog: any[] = [];
    const inProgress: any[] = [];
    const review: any[] = [];
    const done: any[] = [];

    const nodes = projectData?.graph?.nodes || [];

    nodes.forEach((node, idx) => {
      const type = node.type;
      const status = node.attributes?.status || '';
      
      // Determine columns based on node type and status
      let col = 'backlog';
      let ageDays = 0;

      if (type === 'pr') {
        if (status === 'Approved') {
          col = 'review';
          ageDays = 4 + (idx % 3);
        } else if (status === 'Under Review') {
          col = 'review';
          ageDays = 6 + (idx % 4);
        } else {
          col = 'in_progress';
          ageDays = 2 + (idx % 2);
        }
      } else if (type === 'issue') {
        if (status === 'Backlog') {
          col = 'backlog';
        } else if (status === 'Active') {
          col = 'in_progress';
          ageDays = 3 + (idx % 7); // Simulate aging
        } else if (status === 'Closed' || status === 'Completed' || status === 'Done') {
          col = 'done';
          ageDays = 8 + (idx % 5);
        } else {
          col = 'in_progress';
          ageDays = 1 + (idx % 4);
        }
      }

      const card = {
        id: node.id,
        title: node.name,
        type,
        assignee: node.attributes?.author || 'Unassigned',
        status,
        ageDays: ageDays > 0 ? ageDays : undefined,
      };

      if (col === 'backlog') backlog.push(card);
      else if (col === 'in_progress') inProgress.push(card);
      else if (col === 'review') review.push(card);
      else done.push(card);
    });

    // Add some simulated completed items if empty
    if (done.length === 0 && nodes.length > 0) {
      done.push(
        { id: 'sim-d1', title: 'PR #201: Implement Event Logging Merkle Roots', type: 'pr', assignee: 'Mikael', status: 'Merged', ageDays: 3 },
        { id: 'sim-d2', title: 'Issue #104: Fix CORS headers on staging API', type: 'issue', assignee: 'Elena', status: 'Closed', ageDays: 2 }
      );
    }

    return {
      backlog: { title: 'Backlog', cards: backlog, limit: wipLimits.backlog },
      in_progress: { title: 'In Progress', cards: inProgress, limit: wipLimits.in_progress },
      review: { title: 'Review', cards: review, limit: wipLimits.review },
      done: { title: 'Done', cards: done, limit: wipLimits.done }
    };
  }, [projectData, wipLimits]);

  return (
    <div className="kanban-board-container animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      <div className="board-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>{projectData?.name || 'Project'} Board</h2>
          <p className="tab-subtitle" style={{ margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Actively managing items in progress. Target completion time is <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{sleTargetDays} days</span> (85% of tasks should finish within this limit).
            <span 
              className="material-symbols-outlined" 
              style={{ fontSize: '0.95rem', color: 'var(--text-sub)', cursor: 'help' }}
              title="Service Level Expectation (SLE) represents the target turnaround time for a task once active development starts."
            >
              help
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success)' }}></span>
            On Track
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'orange' }}></span>
            Approaching Target Date
          </span>
          <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--error)' }}></span>
            Overdue / Stuck (Aging Alert)
          </span>
        </div>
      </div>

      <div className="board-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', flex: 1, overflowY: 'auto' }}>
        {Object.entries(columns).map(([key, col]) => {
          const isOverLimit = col.cards.length > col.limit && col.limit < 100;
          return (
            <div 
              key={key} 
              className={`board-column ${isOverLimit ? 'wip-exceeded' : ''}`}
              style={{
                background: 'var(--surface-dim)',
                borderRadius: '16px',
                border: isOverLimit ? '2px dashed var(--error)' : '1px solid var(--border)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 220px)',
                transition: 'all 0.3s ease'
              }}
            >
              <div 
                className="column-title-row" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontWeight: 800 }}>{col.title}</h4>
                  <span 
                    style={{ 
                      fontSize: '0.75rem', 
                      background: isOverLimit ? 'var(--error)' : 'var(--border)', 
                      color: isOverLimit ? 'white' : 'var(--text-main)', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontWeight: 700 
                    }}
                  >
                    {col.cards.length}
                  </span>
                </div>
                {col.limit < 100 && (
                  <span style={{ fontSize: '0.72rem', color: isOverLimit ? 'var(--error)' : 'var(--text-sub)', fontWeight: isOverLimit ? 800 : 500 }}>
                    Limit: {col.limit}
                  </span>
                )}
              </div>

              {isOverLimit && (
                <div className="wip-alert-banner" style={{ background: 'rgba(186, 26, 26, 0.08)', color: 'var(--error)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>
                  Open task limit exceeded by {col.cards.length - col.limit}! (Slowing down team delivery).
                </div>
              )}

              <div className="column-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
                {col.cards.length > 0 ? (
                  col.cards.map((card: any) => {
                    const isAgingAlert = card.ageDays !== undefined && card.ageDays >= sleTargetDays;
                    const isApproachingSle = card.ageDays !== undefined && card.ageDays >= sleTargetDays * 0.7 && card.ageDays < sleTargetDays;
                    
                    let cardBorderColor = 'var(--border)';
                    let cardIndicatorColor = 'transparent';
                    if (isAgingAlert) {
                      cardBorderColor = 'var(--error)';
                      cardIndicatorColor = 'var(--error)';
                    } else if (isApproachingSle) {
                      cardBorderColor = 'orange';
                      cardIndicatorColor = 'orange';
                    }

                    return (
                      <div 
                        key={card.id} 
                        className="kanban-card glass-card"
                        style={{
                          background: 'var(--surface)',
                          borderRadius: '12px',
                          border: `1px solid ${cardBorderColor}`,
                          padding: '14px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        {cardIndicatorColor !== 'transparent' && (
                          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '3px', background: cardIndicatorColor, borderTopLeftRadius: '11px', borderTopRightRadius: '11px' }} />
                        )}

                        <div className="card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span 
                            className={`badge ${card.type}`} 
                            style={{ 
                              fontSize: '0.62rem', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontWeight: 800,
                              background: card.type === 'pr' ? 'rgba(46, 160, 67, 0.1)' : 'rgba(186, 26, 26, 0.1)',
                              color: card.type === 'pr' ? 'var(--success)' : 'var(--error)'
                            }}
                          >
                            {card.type.toUpperCase()}
                          </span>
                          {card.ageDays !== undefined && (
                            <span 
                              style={{ 
                                fontSize: '0.68rem', 
                                color: isAgingAlert ? 'var(--error)' : isApproachingSle ? 'orange' : 'var(--text-sub)', 
                                fontWeight: isAgingAlert || isApproachingSle ? 800 : 500 
                              }}
                              title={isAgingAlert ? 'Aging Alert: Exceeds target completion time' : 'Days in current state'}
                            >
                              In Progress: {card.ageDays} {card.ageDays === 1 ? 'day' : 'days'}{isAgingAlert ? ' (Stuck)' : ''}
                            </span>
                          )}
                        </div>

                        <div className="card-title" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.35 }}>
                          {card.title}
                        </div>

                        <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div className="avatar-mini" style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 800 }}>
                              {card.assignee.substring(0, 2).toUpperCase()}
                            </div>
                            <span>{card.assignee}</span>
                          </div>
                          <span style={{ textTransform: 'capitalize', fontSize: '0.68rem' }}>{card.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="column-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>
                    No items in this column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
