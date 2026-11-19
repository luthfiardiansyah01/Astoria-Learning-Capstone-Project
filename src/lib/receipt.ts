// Kuitansi pembayaran Premium yang dikirim setelah pembayaran dikonfirmasi.
interface ReceiptInput {
  name: string;
  orderId: string;
  amount: number;
  paidAt: Date;
  expiresAt: Date;
  provider: string;
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function tanggal(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function providerLabel(provider: string) {
  if (provider === "manual") return "Transfer manual";
  if (provider === "midtrans") return "Midtrans";
  if (provider === "xendit") return "Xendit";
  return provider;
}

export function receiptEmail(input: ReceiptInput) {
  const amount = rupiah(input.amount);
  const paidAt = tanggal(input.paidAt);
  const expiresAt = tanggal(input.expiresAt);
  const method = providerLabel(input.provider);

  const subject = `Kuitansi Premium SOBAT ADI - ${input.orderId}`;
  const text = [
    `Halo ${input.name},`,
    "",
    "Pembayaran Premium kamu sudah kami terima.",
    "",
    `Nomor pesanan : ${input.orderId}`,
    `Nominal       : ${amount}`,
    `Metode        : ${method}`,
    `Tanggal bayar : ${paidAt}`,
    `Premium aktif : sampai ${expiresAt}`,
    "",
    "Simpan email ini sebagai bukti pembayaran.",
    "Bantuan: admin1@moedatrace.com",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Kuitansi Premium SOBAT ADI</h2>
      <p>Halo <strong>${escapeHtml(input.name)}</strong>,</p>
      <p>Pembayaran Premium kamu sudah kami terima. Berikut rinciannya:</p>
      <table style="border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#555">Nomor pesanan</td><td><strong>${escapeHtml(input.orderId)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Nominal</td><td>${escapeHtml(amount)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Metode</td><td>${escapeHtml(method)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Tanggal bayar</td><td>${escapeHtml(paidAt)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#555">Premium aktif</td><td>sampai ${escapeHtml(expiresAt)}</td></tr>
      </table>
      <p style="margin-top:16px">Simpan email ini sebagai bukti pembayaran.</p>
      <p style="font-size:12px;color:#555">Bantuan: admin1@moedatrace.com</p>
    </div>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
