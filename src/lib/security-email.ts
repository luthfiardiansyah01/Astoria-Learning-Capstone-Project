function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function newDeviceEmail(input: { name: string; device: string; time: Date }) {
  const waktu = input.time.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "long",
    timeStyle: "short",
  });
  const name = escapeHtml(input.name);
  const device = escapeHtml(input.device);
  return {
    subject: "Login baru di SOBAT ADI",
    text: `Halo ${input.name}, akun SOBAT ADI Anda baru saja masuk dari perangkat baru pada ${waktu}. Perangkat: ${input.device}. Jika ini bukan Anda, segera ganti password dan hubungi admin.`,
    html: `<p>Halo ${name},</p>
<p>Akun SOBAT ADI Anda baru saja masuk dari perangkat baru.</p>
<ul>
  <li>Waktu: ${waktu} WIB</li>
  <li>Perangkat: ${device}</li>
</ul>
<p>Jika ini bukan Anda, segera ganti password melalui halaman Akun, lalu hubungi admin.</p>`,
  };
}
