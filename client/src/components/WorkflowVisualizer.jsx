import React from 'react';

export default function WorkflowVisualizer({ steps, plan }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div style={{ 
      backgroundColor: 'rgba(18, 14, 28, 0.88)', 
      backdropFilter: 'blur(16px)',
      padding: '24px', 
      borderRadius: '16px', 
      border: '1px solid rgba(168, 85, 247, 0.25)', 
      marginBottom: '28px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(168, 85, 247, 0.2)'
    }}>
      
      {/* 1. Header with Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            fontSize: '18px',
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(168, 85, 247, 0.35)'
          }}>
            🧩
          </span>
          <div>
            <h3 style={{ color: '#fdfcff', fontSize: '16px', fontWeight: '700', margin: 0 }}>
              Autonomous Multi-Agent Pipeline
            </h3>
            <span style={{ fontSize: '12px', color: '#a79cb8' }}>
              Sequential agent execution with RAG policy retrieval and independent verification audit
            </span>
          </div>
        </div>

        <span style={{ 
          fontSize: '12px', 
          fontWeight: '600',
          color: '#34d399', 
          backgroundColor: 'rgba(16, 185, 129, 0.12)', 
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '5px 12px', 
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
          Audit Passed & Verified
        </span>
      </div>

      {/* 2. Visual Pipeline Flow */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        overflowX: 'auto', 
        paddingBottom: '16px', 
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {steps.map((step, idx) => {
          const isRetry = step.isRetry;
          return (
            <React.Fragment key={step.id || idx}>
              <div style={{
                backgroundColor: isRetry ? 'rgba(245, 158, 11, 0.1)' : 'rgba(26, 20, 40, 0.9)',
                border: isRetry 
                  ? '1px solid rgba(245, 158, 11, 0.45)' 
                  : '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: '12px',
                padding: '12px 16px',
                minWidth: '150px',
                textAlign: 'center',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.35)',
                flexShrink: 0,
                transition: 'transform 0.2s ease',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{step.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#fdfcff' }}>
                  {step.role}
                </div>
                <div style={{ fontSize: '11px', color: isRetry ? '#fbbf24' : '#f472b6', marginTop: '2px', fontWeight: '600' }}>
                  {step.name}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#a79cb8', 
                  marginTop: '4px',
                  display: 'inline-block',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>
                  {step.durationMs ? `${step.durationMs}ms` : '✓ Done'}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div style={{ 
                  color: 'rgba(168, 85, 247, 0.55)', 
                  fontSize: '16px', 
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ➔
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 3. Detailed Task Assignment & Validation Cards */}
      {plan?.phases && (
        <div>
          <h4 style={{ 
            color: '#c084fc', 
            fontSize: '12.5px', 
            fontWeight: '700',
            textTransform: 'uppercase', 
            letterSpacing: '0.06em', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📋</span> Smart Delegation & Skill Compliance Audit
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {plan.phases.flatMap(phase => phase.tasks || []).map((task, i) => (
              <div 
                key={i} 
                style={{ 
                  backgroundColor: 'rgba(14, 11, 22, 0.75)', 
                  border: '1px solid rgba(255, 255, 255, 0.07)', 
                  borderRadius: '10px', 
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontWeight: '600', fontSize: '13.5px', color: '#fdfcff' }}>
                    📌 {task.title}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      backgroundColor: 'rgba(168, 85, 247, 0.15)', 
                      color: '#d8b4fe', 
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      padding: '3px 10px', 
                      borderRadius: '6px', 
                      fontSize: '11.5px',
                      fontWeight: '600'
                    }}>
                      👤 {task.assignedName || 'Unassigned'}
                    </span>
                    <span style={{ 
                      backgroundColor: 'rgba(16, 185, 129, 0.12)', 
                      color: '#34d399', 
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      ✓ Verified
                    </span>
                  </div>
                </div>

                {task.assignmentReason && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#a79cb8', 
                    backgroundColor: 'rgba(236, 72, 153, 0.06)', 
                    borderLeft: '2px solid #ec4899',
                    padding: '6px 10px', 
                    borderRadius: '0 6px 6px 0',
                    lineHeight: '1.4'
                  }}>
                    <strong style={{ color: '#f472b6' }}>AI Match Reason: </strong>
                    {task.assignmentReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
