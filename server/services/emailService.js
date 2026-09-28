// server/services/emailService.js
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

function formatDate(daysToAdd) {
  const date = new Date();
  date.setDate(date.getDate() + Number(daysToAdd || 0));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getMailTransporter() {
  if (!nodemailer || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

/**
 * Builds standard sprint schedule HTML email template
 */
function buildTaskScheduleEmailHtml({ member, projectName, tasks }) {
  const priorityColorMap = {
    High: '#ef4444',
    Medium: '#f59e0b',
    Low: '#10b981'
  };

  const tasksHtml = tasks.map((t, index) => {
    const isFirst = index === 0;
    const priorityColor = priorityColorMap[t.priority] || '#f59e0b';
    const statusBadge = isFirst
      ? '<span style="background-color: #ef4444; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">🔥 STEP 1: DO FIRST</span>'
      : `<span style="background-color: #334155; color: #94a3b8; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">➡️ STEP ${index + 1}: QUEUED</span>`;

    const packagesHtml = t.recommendedPackages && t.recommendedPackages.length > 0
      ? `<div style="margin: 0 0 10px 0;">
          ${t.recommendedPackages.map(pkg => `
            <span style="background-color: #0f172a; color: #38bdf8; border: 1px solid #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px; font-family: monospace; display: inline-block; margin-bottom: 4px;">📦 ${pkg}</span>
          `).join('')}
        </div>`
      : '';

    const deliverablesHtml = t.keyDeliverables && t.keyDeliverables.length > 0
      ? `<ul style="margin: 0 0 12px 0; padding-left: 18px; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
          ${t.keyDeliverables.map(d => `<li style="margin-bottom: 3px;">${d}</li>`).join('')}
        </ul>`
      : '';

    return `
      <div style="background-color: #1e293b; border-left: 5px solid ${priorityColor}; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          ${statusBadge}
          <span style="border: 1px solid ${priorityColor}; color: ${priorityColor}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase;">
            ${t.priority || 'MEDIUM'} PRIORITY
          </span>
        </div>
        <h3 style="color: #f8fafc; margin: 0 0 6px 0; font-size: 16px;">${t.title}</h3>
        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">📌 Phase: <strong style="color: #cbd5e1;">${t.phaseName}</strong></p>
        ${packagesHtml}
        ${deliverablesHtml}
        <div style="background-color: #0f172a; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #38bdf8; display: flex; justify-content: space-between;">
          <span>⏱️ Duration: <strong>${t.estimatedDays} days</strong></span>
          <span>📅 Start: <strong>${t.startDateStr}</strong></span>
          <span>⏰ Deadline: <strong style="color: #f43f5e;">${t.dueDateStr}</strong></span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 640px; margin: 0 auto; border: 1px solid #334155;">
      <h2 style="color: #818cf8; margin-top: 0; font-size: 22px;">🎯 Sprint Backlog: ${projectName}</h2>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 20px;">
        Hi <strong style="color: #f8fafc;">${member.name}</strong> (${member.role}), here is your step-by-step task schedule. Execute tasks in the specified order:
      </p>
      <div>${tasksHtml}</div>
      <p style="color: #64748b; font-size: 11px; margin-top: 24px; text-align: center;">
        Dispatched by AI Project Planner • Automated Agentic Sprint Notification
      </p>
    </div>
  `;
}

async function sendIndividualTaskEmails({ teamMembers, projectName, planData }) {
  const dispatches = [];
  const transporter = getMailTransporter();
  const priorityWeight = { High: 1, Medium: 2, Low: 3 };

  for (const member of teamMembers || []) {
    if (!member.email || !member.email.trim()) continue;

    // Filter tasks assigned specifically to this developer and calculate timeline
    const rawAssignedTasks = [];
    let cumulativeDayCount = 0;

    (planData?.phases || []).forEach((phase) => {
      (phase.tasks || []).forEach((task) => {
        const taskDuration = Number(task.estimatedDays) || 1;
        const taskStartDay = cumulativeDayCount;
        const taskEndDay = cumulativeDayCount + taskDuration;
        cumulativeDayCount = taskEndDay;

        if (task.assignedToEmail === member.email) {
          rawAssignedTasks.push({
            phaseName: phase.name,
            ...task,
            startDay: taskStartDay,
            endDay: taskEndDay,
            startDateStr: formatDate(taskStartDay),
            dueDateStr: formatDate(taskEndDay)
          });
        }
      });
    });

    if (rawAssignedTasks.length === 0) continue;

    // Sort by chronological start day first, then priority
    rawAssignedTasks.sort((a, b) => {
      if (a.startDay !== b.startDay) return a.startDay - b.startDay;
      return (priorityWeight[a.priority] || 2) - (priorityWeight[b.priority] || 2);
    });

    // Build Email HTML
    const htmlBody = buildTaskScheduleEmailHtml({
      member,
      projectName,
      tasks: rawAssignedTasks
    });

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: `"AI Project Planner" <${process.env.EMAIL_USER}>`,
          to: member.email,
          subject: `🎯 Sprint Schedule & Tasks: ${projectName}`,
          html: htmlBody
        });

        const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
        if (previewUrl) {
          console.log(`✅ Real SMTP Email sent to ${member.email}! Preview: ${previewUrl}`);
        } else {
          console.log(`✅ Real SMTP Email sent to ${member.email}!`);
        }

        dispatches.push({
          developer: member.name,
          email: member.email,
          role: member.role,
          count: rawAssignedTasks.length,
          status: 'Real SMTP'
        });
      } catch (err) {
        console.error(`❌ SMTP Failed for ${member.email}: ${err.message}`);
        dispatches.push({
          developer: member.name,
          email: member.email,
          role: member.role,
          count: rawAssignedTasks.length,
          status: 'Failed',
          error: err.message
        });
      }
    } else {
      // Mock Mode
      dispatches.push({
        developer: member.name,
        email: member.email,
        role: member.role,
        count: rawAssignedTasks.length,
        status: 'Mock Mode'
      });
    }
  }

  return dispatches;
}

module.exports = { sendIndividualTaskEmails };
