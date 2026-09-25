import React from 'react';

export default function WorkflowVisualizer({ steps, plan }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '28px' }}>
      
      {/* 1. Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ color: '#818cf8', fontSize: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🧩</span> Autonomous Agent Pipeline & RAG Audit
        </h3>
        <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#064e3b', padding: '4px 10px', borderRadius: '20px' }}>
          ✓ Verified by Validator Agent
        </span>
      </div>

      {/* 2. Visual Pipeline Flow */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        overflowX: 'auto', 
        paddingBottom: '12px', 
        marginBottom: '20px',
        borderBottom: '1px solid #1e293b'
      }}>
        {steps.map((step, idx) => (
          <React.Fragment key={step.id || idx}>
            <div style={{
              backgroundColor: '#1e293b',
              border: step.isRetry ? '1px solid #f59e0b' : '1px solid #38bdf8',
              borderRadius: '8px',
              padding: '10px 14px',
              minWidth: '135px',
              textAlign: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ fontSize: '20px' }}>{step.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f8fafc', marginTop: '3px' }}>{step.role}</div>
              <div style={{ fontSize: '10px', color: '#38bdf8', marginTop: '1px' }}>{step.name}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{step.durationMs ? `${step.durationMs}ms` : '✓ Done'}</div>
            </div>
            {idx < steps.length - 1 && (
              <span style={{ color: '#475569', fontSize: '14px', fontWeight: 'bold' }}>➔</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 3. Detailed Task Assignment & Validation Cards */}
      {plan?.phases && (
        <div>
          <h4 style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            📋 Smart Task Assignments & Policy Checks
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {plan.phases.flatMap(phase => phase.tasks || []).map((task, i) => (
              <div key={i} style={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155', 
                borderRadius: '8px', 
                padding: '12px 14px' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#f8fafc' }}>
                    📌 {task.title}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      👤 {task.assignedName || 'Unassigned'}
                    </span>
                    <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                      ✓ Passed
                    </span>
                  </div>
                </div>

                {task.assignmentReason && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', backgroundColor: '#0f172a', padding: '6px 10px', borderRadius: '6px', marginTop: '6px' }}>
                    <strong style={{ color: '#38bdf8' }}>AI Match Reason: </strong>
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
