// Email transaksional kolaborasi: undangan tim dan ringkasan tenggat.
import { appUrl } from "./app-url";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function teamInviteEmail(input: {
  inviterName: string;
  teamName: string;
  inviteeName: string;
}) {
  const url = `${appUrl()}/collab`;
  const subject = `Undangan bergabung ke tim ${input.teamName}`;
  const text = `Halo ${input.inviteeName},\n\n${input.inviterName} mengundangmu bergabung ke tim "${input.teamName}" di SOBAT ADI.\n\nBuka ${url} untuk menerima atau menolak undangan.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Undangan tim ${escapeHtml(input.teamName)}</h2>
      <p>Halo <strong>${escapeHtml(input.inviteeName)}</strong>,</p>
      <p><strong>${escapeHtml(input.inviterName)}</strong> mengundangmu bergabung ke tim
      <strong>${escapeHtml(input.teamName)}</strong> di SOBAT ADI.</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buka Collab</a></p>
      <p style="font-size:12px;color:#555">Jika kamu tidak mengenal pengundang, abaikan email ini.</p>
    </div>`;
  return { subject, text, html };
}

export interface DueTask {
  title: string;
  projectName: string;
  dueDate: Date;
  overdue: boolean;
}

export function dueTasksEmail(input: { name: string; tasks: DueTask[] }) {
  const subject = "Ringkasan tenggat tugas - SOBAT ADI";
  const lines = input.tasks.map(
    (t) =>
      `- ${t.title} (${t.projectName}) - ${t.overdue ? "TERLAMBAT" : "mendekati"} ${t.dueDate.toLocaleDateString("id-ID")}`
  );
  const text = `Halo ${input.name},\n\nBerikut tugas yang perlu perhatian:\n\n${lines.join("\n")}\n\nBuka ${appUrl()}/collab untuk detail.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Ringkasan tenggat tugas</h2>
      <p>Halo <strong>${escapeHtml(input.name)}</strong>,</p>
      <ul>
        ${input.tasks
          .map(
            (t) =>
              `<li><strong>${escapeHtml(t.title)}</strong> - ${escapeHtml(t.projectName)} · ${
                t.overdue ? "terlambat" : "mendekati"
              } ${escapeHtml(t.dueDate.toLocaleDateString("id-ID"))}</li>`
          )
          .join("")}
      </ul>
      <p><a href="${escapeHtml(appUrl())}/collab" style="display:inline-block;background:#059669;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Buka Collab</a></p>
    </div>`;
  return { subject, text, html };
}
