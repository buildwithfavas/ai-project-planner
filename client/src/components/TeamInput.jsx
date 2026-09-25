import React from 'react';

export default function TeamInput({ teamMembers, setTeamMembers }) {
  // When adding a new member, give default values for skills, activeTasksCount, and isOnLeave
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

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
        👥 Team Members (Smart Workload & Skill Dispatcher)
      </label>
      
      {teamMembers.map((m, i) => (
        <div key={i} style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.2fr 1.5fr 1fr 1.5fr 70px 90px auto', 
          gap: '8px', 
          alignItems: 'center',
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: m.isOnLeave ? '#1f1515' : '#0f172a',
          border: m.isOnLeave ? '1px solid #7f1d1d' : '1px solid #1e293b',
          borderRadius: '8px'
        }}>
          {/* 1. Name */}
          <input 
            type="text" 
            placeholder="Name" 
            value={m.name} 
            onChange={e => updateMember(i, 'name', e.target.value)} 
            style={inputStyle} 
          />

          {/* 2. Email */}
          <input 
            type="email" 
            placeholder="Email" 
            value={m.email} 
            onChange={e => updateMember(i, 'email', e.target.value)} 
            style={inputStyle} 
          />

          {/* 3. Role */}
          <select value={m.role} onChange={e => updateMember(i, 'role', e.target.value)} style={inputStyle}>
            <option value="Frontend">Frontend Developer</option>
            <option value="Backend">Backend Developer</option>
            <option value="Database">Database / DevOps</option>
            <option value="QA">QA & Testing</option>
          </select>

          {/* 4. Skills (comma separated) */}
          <input 
            type="text" 
            placeholder="Skills (e.g. React, Node)" 
            value={Array.isArray(m.skills) ? m.skills.join(', ') : (m.skills || '')} 
            onChange={e => updateMember(i, 'skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
            style={inputStyle} 
          />

          {/* 5. Active Tasks Count */}
          <input 
            type="number" 
            min="0" 
            max="10" 
            title="Active Tasks Count"
            placeholder="Tasks" 
            value={m.activeTasksCount ?? 0} 
            onChange={e => updateMember(i, 'activeTasksCount', parseInt(e.target.value, 10) || 0)} 
            style={{ ...inputStyle, textAlign: 'center' }} 
          />

          {/* 6. Leave Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: m.isOnLeave ? '#f87171' : '#94a3b8', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={m.isOnLeave || false} 
              onChange={e => updateMember(i, 'isOnLeave', e.target.checked)} 
            />
            {m.isOnLeave ? 'On Leave' : 'Active'}
          </label>

          {/* 7. Delete Button */}
          <button type="button" onClick={() => removeMember(i)} style={deleteBtnStyle}>✕</button>
        </div>
      ))}
      <button type="button" onClick={addMember} style={addBtnStyle}>+ Add Developer</button>
    </div>
  );
}

const inputStyle = { backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '8px 10px', fontSize: '13px' };
const deleteBtnStyle = { backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' };
const addBtnStyle = { backgroundColor: '#1e293b', border: '1px dashed #334155', color: '#38bdf8', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' };
