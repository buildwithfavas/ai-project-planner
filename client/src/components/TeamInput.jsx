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

  const getRoleColor = (role) => {
    switch (role) {
      case 'Frontend': return { bg: 'rgba(236, 72, 153, 0.14)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.35)' };
      case 'Backend': return { bg: 'rgba(139, 92, 246, 0.14)', text: '#c084fc', border: 'rgba(139, 92, 246, 0.35)' };
      case 'Database': return { bg: 'rgba(245, 158, 11, 0.14)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
      case 'QA': return { bg: 'rgba(16, 185, 129, 0.14)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' };
      default: return { bg: 'rgba(168, 85, 247, 0.14)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.35)' };
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>
            👥 Team Members Roster
          </label>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Workload limit is 3 tasks. AI assigns tasks based on skills, capacity, and availability.
          </span>
        </div>
        <span style={{ 
          fontSize: '11.5px', 
          padding: '3px 10px', 
          borderRadius: '9999px', 
          backgroundColor: 'rgba(168, 85, 247, 0.14)', 
          color: '#d8b4fe',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          fontWeight: '600'
        }}>
          {teamMembers.length} Developer{teamMembers.length !== 1 ? 's' : ''} Configured
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {teamMembers.map((m, i) => {
          const roleStyle = getRoleColor(m.role);
          const isAtCapacity = (m.activeTasksCount ?? 0) >= 3;
          
          return (
            <div 
              key={i} 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(120px, 1.2fr) minmax(150px, 1.4fr) minmax(130px, 1fr) minmax(140px, 1.3fr) 80px 105px 36px', 
                gap: '10px', 
                alignItems: 'center',
                padding: '12px 14px',
                backgroundColor: m.isOnLeave 
                  ? 'rgba(239, 68, 68, 0.06)' 
                  : isAtCapacity 
                  ? 'rgba(245, 158, 11, 0.05)' 
                  : 'rgba(18, 14, 28, 0.85)',
                border: m.isOnLeave 
                  ? '1px solid rgba(239, 68, 68, 0.35)' 
                  : isAtCapacity 
                  ? '1px solid rgba(245, 158, 11, 0.35)' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* 1. Name */}
              <input 
                type="text" 
                placeholder="Developer Name" 
                value={m.name} 
                onChange={e => updateMember(i, 'name', e.target.value)} 
                style={teamInputStyle} 
              />

              {/* 2. Email */}
              <input 
                type="email" 
                placeholder="developer@company.com" 
                value={m.email} 
                onChange={e => updateMember(i, 'email', e.target.value)} 
                style={teamInputStyle} 
              />

              {/* 3. Role */}
              <select 
                value={m.role} 
                onChange={e => updateMember(i, 'role', e.target.value)} 
                style={{
                  ...teamInputStyle,
                  backgroundColor: roleStyle.bg,
                  color: roleStyle.text,
                  borderColor: roleStyle.border,
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <option value="Frontend" style={{ background: '#120e1c', color: '#f472b6' }}>Frontend Dev</option>
                <option value="Backend" style={{ background: '#120e1c', color: '#c084fc' }}>Backend Dev</option>
                <option value="Database" style={{ background: '#120e1c', color: '#fbbf24' }}>Database / DevOps</option>
                <option value="QA" style={{ background: '#120e1c', color: '#34d399' }}>QA & Testing</option>
              </select>

              {/* 4. Skills */}
              <input 
                type="text" 
                placeholder="Skills (React, Node, etc.)" 
                value={Array.isArray(m.skills) ? m.skills.join(', ') : (m.skills || '')} 
                onChange={e => updateMember(i, 'skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                style={teamInputStyle} 
                title="Comma separated technical skills"
              />

              {/* 5. Active Tasks Count */}
              <div style={{ position: 'relative' }}>
                <input 
                  type="number" 
                  min="0" 
                  max="10" 
                  title="Current Active Tasks Count"
                  placeholder="Tasks" 
                  value={m.activeTasksCount ?? 0} 
                  onChange={e => updateMember(i, 'activeTasksCount', parseInt(e.target.value, 10) || 0)} 
                  style={{ 
                    ...teamInputStyle, 
                    textAlign: 'center',
                    fontWeight: '700',
                    color: isAtCapacity ? '#fbbf24' : '#fdfcff',
                    borderColor: isAtCapacity ? 'rgba(245, 158, 11, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                  }} 
                />
                {isAtCapacity && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '-6px', 
                    right: '-4px', 
                    backgroundColor: '#f59e0b', 
                    color: '#000', 
                    fontSize: '9px', 
                    padding: '1px 3px', 
                    borderRadius: '4px',
                    fontWeight: '800'
                  }}>
                    MAX
                  </span>
                )}
              </div>

              {/* 6. Leave Checkbox Toggle */}
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '12px', 
                fontWeight: '600',
                color: m.isOnLeave ? '#f87171' : '#34d399', 
                cursor: 'pointer',
                userSelect: 'none',
                padding: '6px 8px',
                borderRadius: '8px',
                backgroundColor: m.isOnLeave ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                border: m.isOnLeave ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.25)',
                justifyContent: 'center'
              }}>
                <input 
                  type="checkbox" 
                  checked={m.isOnLeave || false} 
                  onChange={e => updateMember(i, 'isOnLeave', e.target.checked)} 
                  style={{ accentColor: '#ef4444', cursor: 'pointer' }}
                />
                {m.isOnLeave ? 'On Leave' : 'Active'}
              </label>

              {/* 7. Delete Button */}
              <button 
                type="button" 
                onClick={() => removeMember(i)} 
                title="Remove developer"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  e.currentTarget.style.color = '#f87171';
                }}
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
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '11px',
          backgroundColor: 'rgba(18, 14, 28, 0.7)',
          border: '1px dashed rgba(168, 85, 247, 0.4)',
          color: '#d8b4fe',
          borderRadius: '10px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.14)';
          e.currentTarget.style.borderColor = 'var(--primary-light)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'rgba(18, 14, 28, 0.7)';
          e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
        }}
      >
        <span>+</span> Add Developer to Roster
      </button>
    </div>
  );
}

const teamInputStyle = { 
  width: '100%',
  backgroundColor: 'rgba(12, 9, 20, 0.9)', 
  color: '#fdfcff', 
  border: '1px solid rgba(255, 255, 255, 0.1)', 
  borderRadius: '8px', 
  padding: '8px 11px', 
  fontSize: '13px',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box'
};
