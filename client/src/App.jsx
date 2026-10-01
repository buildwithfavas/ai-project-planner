import { useState } from 'react'
import TeamInput from './components/TeamInput'
import WorkflowVisualizer from './components/WorkflowVisualizer'
import './styles/App.css'

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

  // AI Assistant Copilot state
  const [question, setQuestion] = useState('')
  const [conversationHistory, setConversationHistory] = useState([])
  const [chatSummary, setChatSummary] = useState('')
  const [sessionId, setSessionId] = useState(() => 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7))
  const [assistantLoading, setAssistantLoading] = useState(false)

  // 2. TRIGGER MULTI-AGENT WORKFLOW
  const handleGeneratePlan = async () => {
    setLoading(true)
    setPlan(null)
    setProjectId(null)
    setWorkflowSteps([])
    setEmailDispatches([])
    setConversationHistory([])
    setChatSummary('')
    setSessionId('sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7))

    try {
      const response = await fetch(`${API_BASE_URL}/api/project/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          description,
          experience,
          technology,
          deadline,
          teamMembers
        })
      })

      const data = await response.json()

      if (data.success) {
        setPlan(data.plan)
        setProjectId(data.projectId)
        setWorkflowSteps(data.workflowSteps || [])
      } else {
        alert(data.error || 'Failed to generate agentic plan.')
      }
    } catch (err) {
      console.error(err)
      alert('Network Error: Could not connect to API server at ' + API_BASE_URL)
    } finally {
      setLoading(false)
    }
  }

  // 3. TEAM LEADER MANUAL REASSIGNMENT HANDLER
  const handleReassignTask = (phaseIndex, taskIndex, newEmail) => {
    const assignedMember = teamMembers.find(m => m.email === newEmail)
    if (!assignedMember) return

    setPlan(prevPlan => {
      const newPhases = [...prevPlan.phases]
      const targetTask = { ...newPhases[phaseIndex].tasks[taskIndex] }

      targetTask.assignedToEmail = assignedMember.email
      targetTask.assignedName = assignedMember.name
      targetTask.assignedRole = assignedMember.role
      targetTask.assignmentReason = `Manually reassigned by Team Leader to ${assignedMember.name} (${assignedMember.role})`

      newPhases[phaseIndex].tasks[taskIndex] = targetTask
      return { ...prevPlan, phases: newPhases }
    })
  }

  // 4. TRIGGER EMAIL DISPATCH TOOL
  const handleSendEmails = async () => {
    if (!plan) return
    setEmailSending(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/project/send-emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: plan.projectName || projectName,
          teamMembers,
          plan
        })
      })
      const resData = await res.json()

      if (resData.success) {
        setEmailDispatches(resData.dispatches || [])
      } else {
        alert(resData.error || 'Failed to dispatch emails.')
      }
    } catch (err) {
      console.error(err)
      alert('Network Error during email dispatch.')
    } finally {
      setEmailSending(false)
    }
  }

  // 5. AI COPILOT CHAT HANDLER
  const handleAskAssistant = async () => {
    if (!question.trim()) return

    const userMessage = { role: 'user', text: question }
    const newHistory = [...conversationHistory, userMessage]
    setConversationHistory(newHistory)
    setQuestion('')
    setAssistantLoading(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/project/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          projectId,
          question: userMessage.text,
          projectContext: {
            projectName,
            technology,
            experience,
            deadline
          },
          currentPlan: plan,
          conversationHistory: newHistory
        })
      })
      const data = await res.json()

      if (data.success) {
        setConversationHistory([...newHistory, { role: 'assistant', text: data.answer || data.reply }])
        if (data.summary) {
          setChatSummary(data.summary)
        }
      } else {
        setConversationHistory([...newHistory, { role: 'assistant', text: 'Error: ' + (data.error || 'Unknown error') }])
      }
    } catch (err) {
      setConversationHistory([...newHistory, { role: 'assistant', text: 'Failed to communicate with AI Assistant.' }])
    } finally {
      setAssistantLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'Real SMTP') {
      return (
        <span className="status-badge status-badge-smtp">
          ✓ Real SMTP Sent
        </span>
      )
    }
    if (status === 'Mock Mode') {
      return (
        <span className="status-badge status-badge-mock">
          ⚙️ Mock Mode Dispatched
        </span>
      )
    }
    return (
      <span className="status-badge status-badge-failed">
        ❌ Dispatch Failed
      </span>
    )
  }

  const getComplexityColor = (complexity) => {
    switch (complexity?.toLowerCase()) {
      case 'low': return { bg: '#ecfdf5', text: '#047857' };
      case 'medium': return { bg: '#fffbeb', text: '#b45309' };
      case 'high': return { bg: '#fef2f2', text: '#b91c1c' };
      default: return { bg: '#eff6ff', text: '#1d4ed8' };
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
          <span>Ollama (Llama 3.2) & Multi-Agent Online</span>
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
              className="input-field textarea-input"
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
                className="input-field select-input"
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
                className="input-field select-input"
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
                <span className="loading-spinner-sm"></span>
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
              <h3 className="loading-box-title">
                Multi-Agent Workflow In Progress
              </h3>
              <p className="loading-box-desc">
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
          <section className="glass-panel glass-panel-accent">
            
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
              <div className={`deadline-badge ${plan.deadlineWarning ? 'deadline-badge-warning' : 'deadline-badge-success'}`}>
                {plan.deadlineWarning ? '⚠️ Deadline Adjust Suggested' : '✓ Target Deadline Feasible'}
              </div>
            </div>

            {/* Project Overview */}
            <p className="project-overview-box">
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
                    <div className="metric-icon-wrap metric-icon-wrap-days">
                      📅
                    </div>
                    <div>
                      <div className="metric-label">Estimated Days</div>
                      <div className="metric-value">{plan.estimatedTotalDays} Days</div>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="metric-icon-wrap metric-icon-wrap-phases">
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
                <span className="alert-warning-icon">⚠️</span>
                <div>
                  <strong>Deadline Feasibility Notice:</strong> {plan.deadlineWarning}
                </div>
              </div>
            )}

            {/* DEVELOPMENT PHASES & INTERACTIVE REASSIGNMENT */}
            <div className="phases-section-wrapper">
              <div className="phases-section-header">
                <h3 className="phases-section-title">
                  <span>🚀</span> Development Phases & Interactive Task Reassignment
                </h3>
                <span className="phases-section-subtitle">
                  👑 Team Leader can override assignments using dropdowns
                </span>
              </div>

              {plan.phases.map((phase, pIdx) => (
                <div key={pIdx} className="phase-card">
                  <div className="phase-header">
                    <h4 className="phase-title">
                      <span>📌</span> {phase.name}
                    </h4>
                    <span className="phase-task-count">
                      {phase.tasks?.length || 0} Task{phase.tasks?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="task-list">
                    {phase.tasks.map((task, tIdx) => (
                      <div key={tIdx} className="task-item">
                        <div className="task-content">
                          <div className="task-title">
                            <span className="task-check-icon">☐</span>
                            <span>{task.title}</span>
                          </div>

                          {/* Recommended packages */}
                          {task.recommendedPackages && task.recommendedPackages.length > 0 && (
                            <div className="package-list">
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
                              <strong>AI Assignment Rationale:</strong>{' '}
                              {task.assignmentReason}
                            </div>
                          )}
                        </div>

                        {/* Reassignment Dropdown & Duration */}
                        <div className="reassign-controls">
                          <select
                            value={task.assignedToEmail || ''}
                            onChange={(e) => handleReassignTask(pIdx, tIdx, e.target.value)}
                            className="reassign-select"
                            title="Override task assignment"
                          >
                            {teamMembers.map((m, mIdx) => (
                              <option key={mIdx} value={m.email}>
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
              <div className="risks-card">
                <h4 className="risks-card-title">
                  <span>⚠️</span> Identified Risks & Workload Bottlenecks
                </h4>
                <div className="risks-list">
                  {plan.risks?.map((risk, i) => (
                    <div key={i} className="risk-item">
                      <span className="risk-bullet">•</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA & Testing Card */}
              <div className="qa-card">
                <h4 className="qa-card-title">
                  <span>🧪</span> QA Validation & Audit Strategy
                </h4>
                <div className="qa-list">
                  {plan.testingPlan?.map((test, i) => (
                    <div key={i} className="qa-item">
                      <span className="qa-check">✓</span>
                      <span>{test}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TEAM LEADER EMAIL DISPATCH CONSOLE */}
            <div className="dispatch-console">
              <div className="dispatch-console-header">
                <span className="dispatch-console-icon">👑</span>
                <h4 className="dispatch-console-title">
                  Team Leader Final Approval & Automated Dispatch
                </h4>
              </div>

              <p className="dispatch-console-desc">
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
                    <span className="loading-spinner-sm"></span>
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
                <div className="dispatch-results-box">
                  <div className="dispatch-results-header">
                    <span>✓</span> Task Email Dispatch Confirmation
                  </div>

                  <div className="dispatch-results-list">
                    {emailDispatches.map((d, idx) => (
                      <div key={idx} className="dispatch-result-item">
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
            <div className="panel-header copilot-header">
              <div>
                <h3 className="panel-title copilot-title">
                  <span className="panel-title-icon">💬</span>
                  AI Copilot (Follow-up Planning Assistant)
                </h3>
                <p className="panel-desc">
                  Ask questions about technology trade-offs, architecture decisions, or developer task prioritizations.
                </p>
              </div>
            </div>

            {chatSummary && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '12.5px',
                color: '#78350f',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <span style={{ fontSize: '15px' }}>🧠</span>
                <div>
                  <strong style={{ color: '#92400e', display: 'block', marginBottom: '2px' }}>
                    Persistent Conversation Memory (MongoDB):
                  </strong>
                  <span>{chatSummary}</span>
                </div>
              </div>
            )}

            {conversationHistory.length > 0 && (
              <div className="chat-history-box">
                {conversationHistory.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
                  >
                    <div className="chat-bubble-sender">
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
                className="input-field chat-input"
              />

              <button
                onClick={handleAskAssistant}
                disabled={assistantLoading || !question.trim()}
                className="btn-assistant"
              >
                {assistantLoading ? (
                  <>
                    <span className="loading-spinner-sm"></span>
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