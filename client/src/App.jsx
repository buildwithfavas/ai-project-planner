import { useState } from 'react'
import TeamInput from './components/TeamInput'
import WorkflowVisualizer from './components/WorkflowVisualizer'

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
      activeTasksCount: 3, // Notice: Bennet is already at capacity (3 tasks)!
      isOnLeave: false 
    },
    { 
      name: 'Sarag', 
      email: 'notbro1245@gmail.com', 
      role: 'QA',
      skills: ['Jest', 'Cypress', 'Postman', 'Manual Testing'],
      activeTasksCount: 0,
      isOnLeave: true // Notice: Sarag is on leave!
    }
  ])


  // Response, Loading & Workflow states
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
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
    setResponse('')
    setPlan(null)
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
        setWorkflowSteps(data.workflowSteps || [])
        setResponse(JSON.stringify(data.plan, null, 2))
      } else {
        alert(`Error: ${data.error}`)
        setResponse(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      alert(`Failed to connect to backend server. Make sure it is running on ${API_BASE_URL}.`)
      setResponse('Failed to connect to backend server.')
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
      setResponse(JSON.stringify(updatedPlan, null, 2))
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
    if (!question.trim() || !response) return

    const currentPlan = JSON.parse(response)
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

  const inputStyle = {
    width: '100%',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '16px'
  }

  const getStatusBadge = (status) => {
    if (status === 'Real SMTP') return <span style={{ backgroundColor: '#065f46', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>✓ Real SMTP</span>;
    if (status === 'Mock Mode') return <span style={{ backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>⚙️ Mock Mode</span>;
    return <span style={{ backgroundColor: '#991b1b', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>❌ Failed</span>;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '800px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        padding: '32px'
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span style={{ fontSize: '32px' }}>🤖</span>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: '700',
              background: 'linear-gradient(to right, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              AI Agent Project Planner
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Multi-Agent Workflow with Interactive Team Leader Review & Email Dispatch
            </p>
          </div>
        </div>

        {/* 1. Project Name */}
        <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>
          Project Name
        </label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g., E-Commerce Marketplace"
          style={inputStyle}
        />

        {/* 2. Project Description */}
        <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>
          Project Description
        </label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your project features and goals..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        {/* 3. Experience Level & 4. Technology (2 Columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>
              Experience Level
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              style={inputStyle}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>
              Technology Stack
            </label>
            <select
              value={technology}
              onChange={(e) => setTechnology(e.target.value)}
              style={inputStyle}
            >
              <option value="MERN Stack">MERN Stack (React, Node, Express, MongoDB)</option>
              <option value="Next.js">Next.js + Tailwind</option>
              <option value="Python Django/FastAPI">Python (Django / FastAPI)</option>
              <option value="Java Spring Boot">Java Spring Boot</option>
            </select>
          </div>
        </div>

        {/* 5. Target Deadline */}
        <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>
          Target Deadline
        </label>
        <input
          type="text"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          placeholder="e.g., 30 days"
          style={inputStyle}
        />

        {/* 6. TEAM MEMBERS INPUT */}
        <TeamInput teamMembers={teamMembers} setTeamMembers={setTeamMembers} />

        {/* Submit Button */}
        <button
          onClick={handleGeneratePlan}
          disabled={loading || !projectName.trim() || !description.trim()}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffffff',
            background: (projectName.trim() && description.trim()) ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' : '#334155',
            border: 'none',
            borderRadius: '10px',
            cursor: (projectName.trim() && description.trim()) ? 'pointer' : 'not-allowed',
            marginTop: '8px'
          }}
        >
          {loading ? '⚙️ Running Multi-Agent Workflow...' : '✨ Execute Agentic Plan'}
        </button>

        {/* WORKFLOW VISUALIZER STEP CARDS */}
        {loading && (
          <div style={{ marginTop: '24px', backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', textAlign: 'center' }}>
            <h3 style={{ color: '#818cf8', fontSize: '16px', margin: 0 }}>⚙️ Multi-Agent System Executing...</h3>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
              🧠 Planner Agent ➔ 🔍 RAG Knowledge Engine ➔ ⚙️ Executor Agent ➔ 🛡️ Validator Agent
            </p>
          </div>
        )}

        {workflowSteps.length > 0 && <WorkflowVisualizer steps={workflowSteps} plan={plan} />}

        {/* PROJECT PLAN DISPLAY & TEAM LEADER REVIEW */}
        {plan && (
          <div style={{ marginTop: '28px' }}>

            {/* Overview */}
            <h3 style={{ color: '#818cf8', fontSize: '14px', marginBottom: '6px' }}>📋 PROJECT OVERVIEW</h3>
            <p style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
              {plan.projectOverview}
            </p>

            {/* Complexity & Days */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <span style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', color: '#f8fafc', fontSize: '13px' }}>
                🎯 Complexity: <strong>{plan.complexity}</strong>
              </span>
              <span style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '8px 14px', color: '#f8fafc', fontSize: '13px' }}>
                📅 Estimated: <strong>{plan.estimatedTotalDays} days</strong>
              </span>
            </div>

            {/* Deadline Warning Banner */}
            {plan.deadlineWarning && (
              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <p style={{ color: '#92400e', fontSize: '13px', margin: 0 }}>
                  ⚠️ {plan.deadlineWarning}
                </p>
              </div>
            )}

            {/* Development Phases & INTERACTIVE TEAM LEADER TASK REASSIGNMENT */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ color: '#818cf8', fontSize: '14px', margin: 0 }}>🚀 DEVELOPMENT PHASES & TASK REASSIGNMENT</h3>
              <span style={{ fontSize: '11px', color: '#38bdf8' }}>👑 Use dropdowns to adjust team assignments</span>
            </div>

            {plan.phases.map((phase, i) => (
              <div key={i} style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <h4 style={{ color: '#c084fc', fontSize: '14px', margin: '0 0 10px 0' }}>{phase.name}</h4>
                {phase.tasks.map((task, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e2e8f0', fontSize: '13px', marginBottom: '8px', padding: '8px 12px', backgroundColor: '#1e293b', borderRadius: '6px' }}>
                    <div style={{ flex: 1, marginRight: '10px' }}>
                      <div style={{ fontWeight: '600', color: '#f1f5f9' }}>☐ {task.title}</div>

                      {/* 📦 Recommended Packages & Tools Pills */}
                      {task.recommendedPackages && task.recommendedPackages.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '6px 0' }}>
                          {task.recommendedPackages.map((pkg, pIdx) => (
                            <span 
                              key={pIdx} 
                              style={{ 
                                backgroundColor: '#0f172a', 
                                color: '#a5f3fc', 
                                border: '1px solid #0891b2', 
                                borderRadius: '4px', 
                                padding: '2px 6px', 
                                fontSize: '11px',
                                fontFamily: 'monospace'
                              }}
                            >
                              📦 {pkg}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 📋 Step-by-Step Deliverables Checklist */}
                      {task.keyDeliverables && task.keyDeliverables.length > 0 && (
                        <ul style={{ margin: '6px 0 6px 18px', padding: 0, fontSize: '12px', color: '#cbd5e1' }}>
                          {task.keyDeliverables.map((item, dIdx) => (
                            <li key={dIdx} style={{ marginBottom: '3px' }}>{item}</li>
                          ))}
                        </ul>
                      )}

                      {/* 💡 AI Assignment Reason */}
                      {task.assignmentReason && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
                          💡 <strong style={{ color: '#38bdf8' }}>AI Match:</strong> {task.assignmentReason}
                        </div>
                      )}
                    </div>


                    {/* Team Leader Interactive Task Reassignment Dropdown */}
                    <select
                      value={task.assignedToEmail || ''}
                      onChange={(e) => handleReassignTask(i, j, e.target.value)}
                      style={{ backgroundColor: '#0f172a', color: '#38bdf8', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      {teamMembers.map((m, idx) => (
                        <option key={idx} value={m.email}>
                          👤 {m.name} ({m.role})
                        </option>
                      ))}
                    </select>

                    <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', marginLeft: '12px' }}>{task.estimatedDays}d</span>
                  </div>
                ))}
              </div>
            ))}

            {/* Risks */}
            <h3 style={{ color: '#818cf8', fontSize: '14px', margin: '20px 0 10px 0' }}>⚠️ RISKS & WORKLOAD AUDIT</h3>
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
              {plan.risks.map((risk, i) => (
                <p key={i} style={{ color: '#fbbf24', fontSize: '13px', margin: '0 0 6px 0' }}>• {risk}</p>
              ))}
            </div>

            {/* Testing Plan */}
            <h3 style={{ color: '#818cf8', fontSize: '14px', margin: '20px 0 10px 0' }}>🧪 QA & TESTING PLAN</h3>
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
              {plan.testingPlan.map((test, i) => (
                <p key={i} style={{ color: '#86efac', fontSize: '13px', margin: '0 0 6px 0' }}>☐ {test}</p>
              ))}
            </div>

            {/* 👑 TEAM LEADER EMAIL DISPATCH CONTROL PANEL */}
            <div style={{ marginTop: '24px', backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #0284c7' }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 6px 0', fontSize: '15px' }}>
                👑 Team Leader Approval & Email Tool Trigger
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '13px', marginBottom: '14px', lineHeight: '1.5' }}>
                Review task workload distribution above. Once you are satisfied with the assignments, click below to trigger the <strong>Email Service Tool</strong> to dispatch individualized task backlogs to developers.
              </p>

              <button
                onClick={handleSendEmails}
                disabled={emailSending}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {emailSending ? '📧 Dispatching Task Emails...' : '📧 Send Approved Task Emails to Team'}
              </button>

              {/* EMAIL DISPATCH LOG CARDS */}
              {emailDispatches.length > 0 && (
                <div style={{ marginTop: '16px', backgroundColor: '#1e293b', padding: '14px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <span style={{ color: '#38bdf8', fontSize: '13px', fontWeight: 'bold' }}>
                    📧 Email Tool Dispatch Confirmation:
                  </span>
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {emailDispatches.map((d, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
                        <span>• <strong>{d.developer}</strong> ({d.email}) ➔ Assigned <strong>{d.count} tasks</strong></span>
                        {getStatusBadge(d.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* AI ASSISTANT SECTION */}
        {response && (
          <div style={{ marginTop: '28px' }}>
            <h3 style={{ fontSize: '15px', color: '#94a3b8', marginBottom: '10px' }}>
              🤖 AI Assistant (Follow-up Chat)
            </h3>

            {conversationHistory.length > 0 && (
              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '12px',
                maxHeight: '250px',
                overflowY: 'auto'
              }}>
                {conversationHistory.map((msg, index) => (
                  <div key={index} style={{
                    marginBottom: '10px',
                    textAlign: msg.role === 'user' ? 'right' : 'left'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: msg.role === 'user' ? '#6366f1' : '#1e293b',
                      border: msg.role === 'assistant' ? '1px solid #334155' : 'none',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      maxWidth: '85%',
                      textAlign: 'left'
                    }}>
                      <strong>{msg.role === 'user' ? 'You' : '🤖 Assistant'}:</strong>
                      <br />
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskAssistant()}
              placeholder="Ask: What should Amal work on first? How to test payment APIs?"
              style={inputStyle}
            />

            <button
              onClick={handleAskAssistant}
              disabled={assistantLoading || !question.trim()}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#ffffff',
                background: question.trim() ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' : '#334155',
                border: 'none',
                borderRadius: '10px',
                cursor: question.trim() ? 'pointer' : 'not-allowed',
                marginTop: '4px'
              }}
            >
              {assistantLoading ? 'Thinking...' : '💬 Ask AI Assistant'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default App