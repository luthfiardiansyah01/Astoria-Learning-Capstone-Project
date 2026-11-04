import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Kebijakan Produk dan Langganan — SOBAT ADI",
  description:
    "Deskripsi produk, paket Free/Premium, trial 7 hari, kuota AI harian, masa aktif, dan kebijakan penggunaan SOBAT ADI.",
};

const ROWS = [
  ["Harga", "Rp0", "Rp19.000 / 30 hari", "Rp0"],
  ["AI per hari", "30", "300", "300"],
  ["AI per menit", "5", "20", "20"],
  ["Isi dokumen", "8.000 karakter", "20.000 karakter", "20.000 karakter"],
  ["PDF", "2 MB", "5 MB", "5 MB"],
  ["Tim yang dibuat", "1", "10", "10"],
  ["Proyek per tim", "2", "10", "10"],
  ["Tugas per proyek", "10", "100", "100"],
  ["Anggota per tim", "3", "30", "30"],
];

export default function ProductPolicyPage() {
  return (
    <LegalPage
      title="Kebijakan Produk dan Langganan"
      description="Penjelasan produk, paket, kuota AI, masa aktif, dan aturan penggunaan SOBAT ADI."
    >
      <LegalSection title="1. Deskripsi produk">
        <p>
          SOBAT ADI adalah platform pendamping belajar berbasis AI untuk mahasiswa, terutama
          mahasiswa Pendidikan Jarak Jauh. Fitur utama meliputi Mentor AI berbasis dokumen (RAG),
          pemrosesan dan moderasi dokumen, kuis otomatis dengan XP dan lencana, kolaborasi tim
          dengan papan Kanban, serta panel admin untuk moderasi dan analitik.
        </p>
      </LegalSection>

      <LegalSection title="2. Paket dan harga">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b text-foreground">
                <th className="py-2 pr-3 font-semibold">Fitur</th>
                <th className="px-3 py-2 font-semibold">Free</th>
                <th className="px-3 py-2 font-semibold">Premium</th>
                <th className="px-3 py-2 font-semibold">Trial</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([feature, free, premium, trial]) => (
                <tr key={feature} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium text-foreground">{feature}</td>
                  <td className="px-3 py-2">{free}</td>
                  <td className="px-3 py-2">{premium}</td>
                  <td className="px-3 py-2">{trial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <LegalList>
          <li>Trial Premium berlaku 7 hari dan diberikan sekali per akun.</li>
          <li>Trial tidak menimbulkan tagihan dan tidak diperpanjang otomatis.</li>
          <li>Setelah trial berakhir, akun kembali ke Free.</li>
          <li>Harga dapat berubah dengan pemberitahuan yang wajar.</li>
          <li>Premium tidak diperpanjang otomatis.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Kuota AI">
        <LegalList>
          <li>Kuota harian dihitung per akun dan direset setiap 00.00 WIB.</li>
          <li>Kuota per menit berlaku terpisah dan tidak direset pada tengah malam.</li>
          <li>Satu permintaan pengguna yang memicu beberapa panggilan AI internal tetap dihitung satu permintaan aplikasi.</li>
          <li>Kuota penyedia AI pihak ketiga berbeda dari kuota aplikasi.</li>
          <li>Penggunaan otomatis, berbagi akun, atau upaya melewati kuota dapat menyebabkan pembatasan.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Masa aktif dan perpanjangan">
        <LegalList>
          <li>Premium aktif 30 hari sejak pembayaran dikonfirmasi.</li>
          <li>Perpanjangan lebih awal menambah masa aktif dari sisa periode yang masih berlaku.</li>
          <li>Tidak ada penagihan otomatis.</li>
          <li>Jika masa aktif berakhir, akun kembali ke Free; data tetap tersimpan sesuai kebijakan retensi.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Kualitas dan batasan AI">
        <LegalList>
          <li>AI dapat salah, tidak lengkap, atau menafsirkan dokumen secara keliru.</li>
          <li>Jawaban AI bukan nasihat akademik, hukum, medis, atau keuangan.</li>
          <li>Pengguna wajib memverifikasi informasi penting dan mengikuti aturan kampus.</li>
          <li>Ketersediaan AI bergantung pada penyedia pihak ketiga.</li>
          <li>Kami tidak menjamin skor kuis, nilai, atau hasil akademik tertentu.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Konten dan dokumen">
        <LegalList>
          <li>Pengguna tetap memiliki hak atas dokumen yang diunggah.</li>
          <li>Pengguna memberi izin terbatas untuk memproses dokumen guna menyediakan Layanan.</li>
          <li>Pengguna wajib memiliki hak atas dokumen dan tidak melanggar hak cipta.</li>
          <li>Dokumen dapat berstatus pending, approved, atau rejected setelah moderasi.</li>
          <li>Dokumen approved dapat digunakan pengguna lain sesuai fitur berbagi.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Akun dan keamanan">
        <LegalList>
          <li>Satu akun untuk satu orang.</li>
          <li>Pengguna bertanggung jawab menjaga kata sandi.</li>
          <li>Akun dan kredensial tidak boleh dibagikan.</li>
          <li>Laporkan akses tidak sah ke {CONTACT_EMAIL}.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Ketersediaan dan dukungan">
        <LegalList>
          <li>Layanan disediakan dengan upaya terbaik, tanpa jaminan 100% uptime.</li>
          <li>Pemeliharaan dapat dilakukan untuk perbaikan mendesak.</li>
          <li>Fitur beta dapat berubah atau dihentikan.</li>
          <li>Dukungan diberikan melalui {CONTACT_EMAIL} pada hari kerja.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="9. Penghentian">
        <p>
          Kami dapat menangguhkan atau menghentikan akun yang melanggar Syarat dan Ketentuan,
          melakukan penipuan, atau membahayakan Layanan. Pengguna dapat berhenti menggunakan
          Layanan kapan saja.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
