import '../styles/TeamInput.css';

export default function TeamInput({ teamMembers, setTeamMembers }) {
  const addMember = () => setTeamMembers([
    ...teamMembers, 
    { name: '', email: '', role: 'Frontend', skills: [], activeTasksCount: 0, isOnLeave: false }
  ]);

  const updateMember = (i, field, val) => {
    const updated = [...teamMembers];
    updated[i][field] = val;
    setTeamMembers(updated);
  };

  const removeMember = (i) => setTeamMembers(teamMembers.filter((_, idx) => idx !== i));

  const getRoleClass = (role) => {
    switch (role) {
      case 'Frontend': return 'role-frontend';
      case 'Backend': return 'role-backend';
      case 'Database': return 'role-database';
      case 'QA': return 'role-qa';
      default: return 'role-default';
    }
  };

  return (
    <div className="team-container">
      <div className="team-header">
        <div>
          <label className="team-label">
            👥 Team Members Roster
          </label>
          <span className="team-subtitle">
            Workload limit is 3 tasks. AI assigns tasks based on skills, capacity, and availability.
          </span>
        </div>
        <span className="team-counter-badge">
          {teamMembers.length} Developer{teamMembers.length !== 1 ? 's' : ''} Configured
        </span>
      </div>
      
      <div className="team-roster">
        {teamMembers.map((m, i) => {
          const isAtCapacity = (m.activeTasksCount ?? 0) >= 3;
          const cardClass = `team-member-card ${m.isOnLeave ? 'team-member-card-leave' : isAtCapacity ? 'team-member-card-capacity' : ''}`;
          
          return (
            <div key={i} className={cardClass}>
              {/* 1. Name */}
              <input 
                type="text" 
                placeholder="Developer Name" 
                value={m.name} 
                onChange={e => updateMember(i, 'name', e.target.value)} 
                className="team-input" 
              />

              {/* 2. Email */}
              <input 
                type="email" 
                placeholder="developer@company.com" 
                value={m.email} 
                onChange={e => updateMember(i, 'email', e.target.value)} 
                className="team-input" 
              />

              {/* 3. Role */}
              <select 
                value={m.role} 
                onChange={e => updateMember(i, 'role', e.target.value)} 
                className={`team-input team-role-select ${getRoleClass(m.role)}`}
              >
                <option value="Frontend">Frontend Dev</option>
                <option value="Backend">Backend Dev</option>
                <option value="Database">Database / DevOps</option>
                <option value="QA">QA & Testing</option>
              </select>

              {/* 4. Skills */}
              <input 
                type="text" 
                placeholder="Skills (React, Node, etc.)" 
                value={Array.isArray(m.skills) ? m.skills.join(', ') : (m.skills || '')} 
                onChange={e => updateMember(i, 'skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                className="team-input" 
                title="Comma separated technical skills"
              />

              {/* 5. Active Tasks Count (strictly capped at 3) */}
              <div className="task-count-wrap">
                <input 
                  type="number" 
                  min="0" 
                  max="3" 
                  title="Current Active Tasks Count (Max 3)"
                  placeholder="Tasks" 
                  value={m.activeTasksCount ?? 0} 
                  onChange={e => {
                    const rawVal = parseInt(e.target.value, 10);
                    const clamped = isNaN(rawVal) ? 0 : Math.max(0, Math.min(3, rawVal));
                    updateMember(i, 'activeTasksCount', clamped);
                  }} 
                  className={`team-input task-count-input ${isAtCapacity ? 'task-count-input-capacity' : ''}`}
                />
                {isAtCapacity && (
                  <span className="task-count-max">
                    MAX
                  </span>
                )}
              </div>

              {/* 6. Leave Checkbox Toggle */}
              <label className={`leave-toggle-label ${m.isOnLeave ? 'leave-toggle-on-leave' : 'leave-toggle-active'}`}>
                <input 
                  type="checkbox" 
                  checked={m.isOnLeave || false} 
                  onChange={e => updateMember(i, 'isOnLeave', e.target.checked)} 
                  className="leave-checkbox"
                />
                {m.isOnLeave ? 'On Leave' : 'Active'}
              </label>

              {/* 7. Delete Button */}
              <button 
                type="button" 
                onClick={() => removeMember(i)} 
                title="Remove developer"
                className="btn-remove-member"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <button 
        type="button" 
        onClick={addMember} 
        className="btn-add-member"
      >
        <span>+</span> Add Developer to Roster
      </button>
    </div>
  );
}
