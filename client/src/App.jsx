import { useState } from 'react'
import TeamInput from './components/TeamInput'
import WorkflowVisualizer from './components/WorkflowVisualizer'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function App() {
  // 1. STATE VARIABLES FOR THE FORM FIELDS
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [experience, setExperience] = useState('Beginner')
  const [technology, setTechnology] = useState('MERN Stack')
  const [deadline, setDeadline] = useState('30 days')

  // Team Members State
  const [teamMembers, setTeamMembers] = useState([
    { 
      name: 'Amal', 
      email: 'Uvamal11@gmail.com', 
      role: 'Frontend',
      skills: ['React', 'Tailwind CSS', 'Redux', 'UI/UX'],
      activeTasksCount: 1,
      isOnLeave: false 
    },
    { 
      name: 'Najeeb', 
      email: 'nnaju044@gmail.com', 
      role: 'Backend',
      skills: ['Node.js', 'Express', 'MongoDB', 'JWT', 'REST APIs'],
      activeTasksCount: 2,
      isOnLeave: false 
    },
    { 
      name: 'Bennet', 
      email: 'bennetsharwin76@gmail.com', 
      role: 'Database',
      skills: ['PostgreSQL', 'MongoDB', 'Redis', 'Docker'],
      activeTasksCount: 3, // At capacity (3 tasks)
      isOnLeave: false 
    },
    { 
      name: 'Sarag', 
      email: 'notbro1245@gmail.com', 
      role: 'QA',
      skills: ['Jest', 'Cypress', 'Postman', 'Manual Testing'],
      activeTasksCount: 0,
      isOnLeave: true // On leave
    }
  ])

  // Loading, Plan & Workflow states
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [projectId, setProjectId] = useState(null)
  const [workflowSteps, setWorkflowSteps] = useState([])

  // Email Tool Dispatch States
  const [emailSending, setEmailSending] = useState(false)
  const [emailDispatches, setEmailDispatches] = useState([])

  // AI Assistant states
  const [question, setQuestion] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [assistantLoading, setAssistantLoading] = useState(false)

  // 2. HANDLE GENERATE PLAN (Phase 1: Planner -> Executor -> Validator)
  const handleGeneratePlan = async () => {
    if (!projectName.trim() || !description.trim()) {
      alert('Please fill in Project Name and Description.')
      return
    }

    setLoading(true)
    setPlan(null)
    setProjectId(null)
    setWorkflowSteps([])
    setEmailDispatches([])

    try {
      const res = await fetch(`${API_BASE_URL}/api/project/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectName,
          description,
          experience,
          technology,
          deadline,
          teamMembers,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPlan(data.plan)
        setProjectId(data.projectId || null)
        setWorkflowSteps(data.workflowSteps || [])
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      alert(`Failed to connect to backend server. Make sure it is running on ${API_BASE_URL}.`)
    } finally {
      setLoading(false)
    }
  }

  // 3. TEAM LEADER TASK REASSIGNMENT HANDLER
  const handleReassignTask = (phaseIndex, taskIndex, selectedEmail) => {
    const updatedPlan = { ...plan }
    const member = teamMembers.find(m => m.email === selectedEmail)

    if (member) {
      updatedPlan.phases[phaseIndex].tasks[taskIndex].assignedToEmail = member.email
      updatedPlan.phases[phaseIndex].tasks[taskIndex].assignedName = member.name
      updatedPlan.phases[phaseIndex].tasks[taskIndex].assignedRole = member.role
      setPlan(updatedPlan)
    }
  }

  // 4. HANDLE EMAIL DISPATCH (Phase 2: Team Leader Manual Trigger)
  const handleSendEmails = async () => {
    if (!plan || !teamMembers || teamMembers.length === 0) return

    setEmailSending(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/project/send-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName,
          teamMembers,
          plan
        })
      })

      const data = await res.json()

      if (res.ok) {
        setEmailDispatches(data.dispatches || [])
        alert(`🎉 Success! Dispatched task emails to ${data.dispatches?.length || 0} team members.`)
      } else {
        alert(`Failed to send emails: ${data.error}`)
      }
    } catch (error) {
      console.error('Email dispatch error:', error)
      alert('Failed to connect to server to send emails.')
    } finally {
      setEmailSending(false)
    }
  }

  // 5. HANDLE AI ASSISTANT
  const handleAskAssistant = async () => {
    if (!question.trim() || !plan) return

    const currentPlan = plan
    setAssistantLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/project/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          projectContext: { projectName, technology, experience, deadline },
          currentPlan,
          conversationHistory,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', text: question },
          { role: 'assistant', text: data.answer },
        ])
        setQuestion('')
      }
    } catch (error) {
      console.error('Assistant error:', error)
    } finally {
      setAssistantLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'Real SMTP') {
      return (
        <span style={{ 
          backgroundColor: 'var(--success-bg)', 
          color: 'var(--success-light)', 
          border: '1px solid var(--success-border)',
          padding: '3px 8px', 
          borderRadius: '4px', 
          fontSize: '11px',
          fontWeight: '600'
        }}>
          ✓ Real SMTP Sent
        </span>
      )
    }
    if (status === 'Mock Mode') {
      return (
        <span style={{ 
          backgroundColor: 'rgba(168, 85, 247, 0.15)', 
          color: '#d8b4fe', 
          border: '1px solid rgba(168, 85, 247, 0.35)',
          padding: '3px 8px', 
          borderRadius: '4px', 
          fontSize: '11px',
          fontWeight: '600'
        }}>
          ⚙️ Mock Mode Dispatched
        </span>
      )
    }
    return (
      <span style={{ 
        backgroundColor: 'var(--danger-bg)', 
        color: 'var(--danger-light)', 
        border: '1px solid var(--danger-border)',
        padding: '3px 8px', 
        borderRadius: '4px', 
        fontSize: '11px',
        fontWeight: '600'
      }}>
        ❌ Dispatch Failed
      </span>
    )
  }

  const getComplexityColor = (complexity) => {
    switch (complexity?.toLowerCase()) {
      case 'low': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'medium': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'high': return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default: return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    }
  }

  const isFormValid = Boolean(projectName.trim() && description.trim())

  return (
    <div>
      {/* 1. TOP NAVIGATION & STATUS BAR */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-logo-icon">🚀</div>
          <div className="brand-title-wrap">
            <h1>AetherPlan AI</h1>
            <p className="brand-subtitle">
              <span>Autonomous Multi-Agent Architecture & Workload Dispatcher</span>
            </p>
          </div>
        </div>

        <div className="header-status-pill">
          <span className="status-dot"></span>
          <span>Gemini 2.5 Flash & RAG Online</span>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="app-main">
        
        {/* CONFIGURATION PANEL */}
        <section className="glass-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                <span className="panel-title-icon">⚙️</span>
                Project Specification
              </h2>
              <p className="panel-desc">
                Define your project scope, target tech stack, and developer roster for agentic planning.
              </p>
            </div>
          </div>

          {/* Form fields */}
          <div className="form-group">
            <label className="form-label">
              <span>Project Name</span>
              <span className="form-label-tag">Required</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. NextGen E-Commerce Marketplace with Microservices"
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Project Overview & Requirements</span>
              <span className="form-label-tag">Required</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe core functionalities (e.g. JWT Auth, Product Catalog, Stripe Payments, Shopping Cart, Admin Analytics)..."
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="grid-2col">
            <div className="form-group">
              <label className="form-label">
                <span>Team Experience Level</span>
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="Beginner">Beginner (1-2 yrs) — Detailed steps & conservative pacing</option>
                <option value="Intermediate">Intermediate (3-5 yrs) — Balanced velocity & standard practices</option>
                <option value="Advanced">Advanced (5+ yrs) — High velocity, advanced patterns</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Target Technology Stack</span>
              </label>
              <select
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                className="input-field"
                style={{ cursor: 'pointer' }}
              >
                <option value="MERN Stack">MERN Stack (MongoDB, Express, React, Node.js)</option>
                <option value="Next.js">Next.js 15 + React Server Components + Tailwind</option>
                <option value="Python Django/FastAPI">Python (FastAPI / Django REST Framework)</option>
                <option value="Java Spring Boot">Java Spring Boot 3 + PostgreSQL</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <span>Target Delivery Deadline</span>
            </label>
            <input
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g. 30 days"
              className="input-field"
            />
          </div>

          {/* TEAM MEMBERS ROSTER */}
          <TeamInput teamMembers={teamMembers} setTeamMembers={setTeamMembers} />

          {/* EXECUTION TRIGGER BUTTON */}
          <button
            onClick={handleGeneratePlan}
            disabled={loading || !isFormValid}
            className="btn-primary"
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', margin: 0 }}></span>
                <span>Executing Autonomous Multi-Agent Workflow...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Execute Agentic Project Plan</span>
              </>
            )}
          </button>

          {/* LOADING STEP CHIPS */}
          {loading && (
            <div className="loading-box">
              <div className="loading-spinner"></div>
              <h3 style={{ color: 'var(--primary-light)', fontSize: '16px', margin: '0 0 6px 0' }}>
                Multi-Agent Workflow In Progress
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Synthesizing architecture, indexing domain policies via vector embeddings, and auditing workloads...
              </p>
              <div className="loading-steps-chips">
                <span className="chip-step">🧠 1. Planner Agent (Architecture)</span>
                <span className="chip-step">🔍 2. RAG Knowledge Search</span>
                <span className="chip-step">⚙️ 3. Executor Agent (Delegation)</span>
                <span className="chip-step">🛡️ 4. Validator Agent (QA Audit)</span>
              </div>
            </div>
          )}
        </section>

        {/* WORKFLOW PIPELINE VISUALIZER */}
        {workflowSteps.length > 0 && (
          <WorkflowVisualizer steps={workflowSteps} plan={plan} />
        )}

        {/* PROJECT PLAN & TEAM LEADER REVIEW HUB */}
        {plan && (
          <section className="glass-panel" style={{ borderTop: '3px solid var(--primary)' }}>
            
            {/* Header */}
            <div className="panel-header">
              <div>
                <h2 className="panel-title">
                  <span className="panel-title-icon">📋</span>
                  Architectural Blueprint & Task Breakdown
                </h2>
                <p className="panel-desc">
                  Validated plan generated by Executor Agent with contextual skill match reasoning.
                </p>
              </div>

              {/* Deadline Feasibility Indicator */}
              <div style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: plan.deadlineWarning ? 'var(--warning-bg)' : 'var(--success-bg)',
                color: plan.deadlineWarning ? 'var(--warning-light)' : 'var(--success-light)',
                border: `1px solid ${plan.deadlineWarning ? 'var(--warning-border)' : 'var(--success-border)'}`
              }}>
                {plan.deadlineWarning ? '⚠️ Deadline Adjust Suggested' : '✓ Target Deadline Feasible'}
              </div>
            </div>

            {/* Project Overview */}
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14.5px', 
              lineHeight: '1.7', 
              margin: '0 0 20px',
              padding: '16px 20px',
              backgroundColor: 'rgba(10, 15, 28, 0.65)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)'
            }}>
              {plan.projectOverview}
            </p>

            {/* Metrics Row */}
            {(() => {
              const compStyle = getComplexityColor(plan.complexity);
              return (
                <div className="metrics-row">
                  <div className="metric-card">
                    <div className="metric-icon-wrap" style={{ backgroundColor: compStyle.bg, color: compStyle.text }}>
                      🎯
                    </div>
                    <div>
                      <div className="metric-label">Complexity</div>
                      <div className="metric-value" style={{ color: compStyle.text }}>{plan.complexity}</div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon-wrap" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                      📅
                    </div>
                    <div>
                      <div className="metric-label">Estimated Days</div>
                      <div className="metric-value">{plan.estimatedTotalDays} Days</div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon-wrap" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                      🚀
                    </div>
                    <div>
                      <div className="metric-label">Phases</div>
                      <div className="metric-value">{plan.phases?.length || 0} Phases</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Deadline Warning Banner if applicable */}
            {plan.deadlineWarning && (
              <div className="alert-warning-banner">
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <strong>Deadline Feasibility Notice:</strong> {plan.deadlineWarning}
                </div>
              </div>
            )}

            {/* DEVELOPMENT PHASES & INTERACTIVE REASSIGNMENT */}
            <div style={{ marginTop: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🚀</span> Development Phases & Interactive Task Reassignment
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--secondary-light)', fontWeight: '600' }}>
                  👑 Team Leader can override assignments using dropdowns
                </span>
              </div>

              {plan.phases.map((phase, pIdx) => (
                <div key={pIdx} className="phase-card">
                  <div className="phase-header">
                    <h4 className="phase-title">
                      <span>📌</span> {phase.name}
                    </h4>
                    <span style={{ 
                      fontSize: '11.5px', 
                      color: 'var(--text-muted)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '3px 10px',
                      borderRadius: '6px'
                    }}>
                      {phase.tasks?.length || 0} Task{phase.tasks?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="task-list">
                    {phase.tasks.map((task, tIdx) => (
                      <div key={tIdx} className="task-item">
                        <div style={{ flex: 1 }}>
                          <div className="task-title">
                            <span style={{ color: 'var(--primary-light)' }}>☐</span>
                            <span>{task.title}</span>
                          </div>

                          {/* Recommended packages */}
                          {task.recommendedPackages && task.recommendedPackages.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                              {task.recommendedPackages.map((pkg, kIdx) => (
                                <span key={kIdx} className="package-pill">
                                  <span>📦</span> {pkg}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Deliverables Checklist */}
                          {task.keyDeliverables && task.keyDeliverables.length > 0 && (
                            <ul className="deliverable-list">
                              {task.keyDeliverables.map((item, dIdx) => (
                                <li key={dIdx}>{item}</li>
                              ))}
                            </ul>
                          )}

                          {/* AI Match Reason Callout */}
                          {task.assignmentReason && (
                            <div className="ai-match-callout">
                              <strong style={{ color: 'var(--secondary-light)' }}>AI Assignment Rationale:</strong>{' '}
                              {task.assignmentReason}
                            </div>
                          )}
                        </div>

                        {/* Reassignment Dropdown & Duration */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <select
                            value={task.assignedToEmail || ''}
                            onChange={(e) => handleReassignTask(pIdx, tIdx, e.target.value)}
                            className="reassign-select"
                            title="Override task assignment"
                          >
                            {teamMembers.map((m, mIdx) => (
                              <option key={mIdx} value={m.email} style={{ background: '#120e1c', color: '#fdfcff' }}>
                                👤 {m.name} ({m.role})
                              </option>
                            ))}
                          </select>

                          <span className="duration-chip">
                            ⏱️ {task.estimatedDays} Day{task.estimatedDays !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* RISKS & TESTING PLAN GRID */}
            <div className="grid-2col" style={{ marginTop: '24px' }}>
              {/* Risks Card */}
              <div style={{
                backgroundColor: 'rgba(11, 17, 33, 0.7)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '12px',
                padding: '18px'
              }}>
                <h4 style={{ 
                  color: 'var(--warning-light)', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span> Identified Risks & Workload Bottlenecks
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.risks?.map((risk, i) => (
                    <div key={i} style={{ 
                      color: '#fef3c7', 
                      fontSize: '12.5px', 
                      display: 'flex', 
                      gap: '8px',
                      lineHeight: '1.5'
                    }}>
                      <span style={{ color: 'var(--warning-light)' }}>•</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA & Testing Card */}
              <div style={{
                backgroundColor: 'rgba(11, 17, 33, 0.7)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '18px'
              }}>
                <h4 style={{ 
                  color: 'var(--success-light)', 
                  fontSize: '14px', 
                  fontWeight: '700', 
                  margin: '0 0 12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🧪</span> QA Validation & Audit Strategy
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {plan.testingPlan?.map((test, i) => (
                    <div key={i} style={{ 
                      color: '#d1fae5', 
                      fontSize: '12.5px', 
                      display: 'flex', 
                      gap: '8px',
                      lineHeight: '1.5'
                    }}>
                      <span style={{ color: 'var(--success-light)' }}>✓</span>
                      <span>{test}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TEAM LEADER EMAIL DISPATCH CONSOLE */}
            <div className="dispatch-console">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>👑</span>
                <h4 style={{ color: 'var(--secondary-light)', margin: 0, fontSize: '16px', fontWeight: '700' }}>
                  Team Leader Final Approval & Automated Dispatch
                </h4>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '18px', lineHeight: '1.6' }}>
                Verify the delegated phases and workloads above. When ready, click below to trigger the <strong>Email Dispatch Tool</strong>.
                Each developer will receive a personalized task backlog with packages and deliverables.
              </p>

              <button
                onClick={handleSendEmails}
                disabled={emailSending}
                className="btn-dispatch"
              >
                {emailSending ? (
                  <>
                    <span className="loading-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }}></span>
                    <span>Dispatching Individualized Task Backlogs...</span>
                  </>
                ) : (
                  <>
                    <span>📧</span>
                    <span>Dispatch Approved Task Emails to Team</span>
                  </>
                )}
              </button>

              {/* Email Dispatch Logs */}
              {emailDispatches.length > 0 && (
                <div style={{ 
                  marginTop: '18px', 
                  backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                  padding: '16px', 
                  borderRadius: '10px', 
                  border: '1px solid rgba(56, 189, 248, 0.3)' 
                }}>
                  <div style={{ 
                    color: 'var(--secondary-light)', 
                    fontSize: '13px', 
                    fontWeight: '700',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>✓</span> Task Email Dispatch Confirmation
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {emailDispatches.map((d, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontSize: '12.5px', 
                        color: 'var(--text-secondary)',
                        padding: '6px 10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '6px'
                      }}>
                        <span>• <strong>{d.developer}</strong> ({d.email}) ➔ Assigned <strong>{d.count} tasks</strong></span>
                        {getStatusBadge(d.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </section>
        )}

        {/* AI ASSISTANT COPILOT (FOLLOW-UP CHAT) */}
        {plan && (
          <section className="assistant-chat-container">
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="panel-title" style={{ fontSize: '16px' }}>
                  <span className="panel-title-icon">💬</span>
                  AI Copilot (Follow-up Planning Assistant)
                </h3>
                <p className="panel-desc">
                  Ask questions about technology trade-offs, architecture decisions, or developer task prioritizations.
                </p>
              </div>
            </div>

            {conversationHistory.length > 0 && (
              <div className="chat-history-box">
                {conversationHistory.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
                  >
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      opacity: 0.8,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {msg.role === 'user' ? '👤 You' : '🤖 AI Copilot'}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-input-bar">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
                placeholder="e.g. Which tasks should Amal start first? How should we structure database migrations?"
                className="input-field"
                style={{ marginBottom: 0 }}
              />

              <button
                onClick={handleAskAssistant}
                disabled={assistantLoading || !question.trim()}
                className="btn-assistant"
              >
                {assistantLoading ? (
                  <>
                    <span className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', margin: 0 }}></span>
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <span>➔</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

      </main>
    </div>
  )
}

export default App