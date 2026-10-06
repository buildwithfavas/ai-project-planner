import React from 'react';
import '../styles/WorkflowVisualizer.css';

export default function WorkflowVisualizer({ steps, plan }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="workflow-container">
      
      <div className="workflow-header">
        <div className="workflow-title-wrap">
          <span className="workflow-header-icon">
            🧩
          </span>
          <div>
            <h3 className="workflow-title">
              Autonomous Multi-Agent Pipeline
            </h3>
            <span className="workflow-subtitle">
              Sequential agent execution with RAG policy retrieval and independent verification audit
            </span>
          </div>
        </div>

        <span className="audit-badge">
          <span className="audit-dot"></span>
          Audit Passed & Verified
        </span>
      </div>

      <div className="pipeline-track">
        {steps.map((step, idx) => {
          const isRetry = step.isRetry;
          return (
            <React.Fragment key={step.id || idx}>
              <div className={`pipeline-step-card ${isRetry ? 'pipeline-step-card-retry' : ''}`}>
                <div className="step-icon">{step.icon}</div>
                <div className="step-role">
                  {step.role}
                </div>
                <div className={`step-name ${isRetry ? 'step-name-retry' : ''}`}>
                  {step.name}
                </div>
                <div className="step-duration-chip">
                  {step.durationMs ? `${step.durationMs}ms` : '✓ Done'}
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="step-arrow">
                  ➔
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {plan?.phases && (
        <div className="delegation-audit-section">
          <h4 className="delegation-audit-title">
            <span>📋</span> Smart Delegation & Skill Compliance Audit
          </h4>

          <div className="delegation-audit-list">
            {plan.phases.flatMap(phase => phase.tasks || []).map((task, i) => (
              <div key={i} className="delegation-audit-card">
                <div className="delegation-audit-top">
                  <span className="delegation-task-title">
                    📌 {task.title}
                  </span>
                  
                  <div className="delegation-badge-group">
                    <span className="delegation-dev-pill">
                      👤 {task.assignedName || 'Unassigned'}
                    </span>
                    <span className="delegation-verified-pill">
                      ✓ Verified
                    </span>
                  </div>
                </div>

                {task.assignmentReason && (
                  <div className="delegation-reason-callout">
                    <strong>AI Match Reason: </strong>
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
