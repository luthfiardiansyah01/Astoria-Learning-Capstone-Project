import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Kebijakan Privasi - SOBAT ADI",
  description:
    "Kebijakan privasi SOBAT ADI: data yang dikumpulkan, tujuan pemrosesan, pemroses pihak ketiga, masa penyimpanan, dan hak pengguna atas data pribadinya.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      description="Data apa yang kami kumpulkan, mengapa, siapa yang memproses, dan hak Anda atas data pribadi."
      version="1.0"
      effectiveDate="16 November 2026"
    >
      <LegalSection title="1. Ruang lingkup">
        <p>
          Kebijakan ini berlaku untuk layanan SOBAT ADI, termasuk situs publik, aplikasi web,
          Mentor AI, unggahan dokumen, kuis, dan fitur kolaborasi tim. Kebijakan ini melengkapi
          Syarat dan Ketentuan serta Kebijakan Produk.
        </p>
        <p>
          Dengan menggunakan Layanan, Anda menyetujui pemrosesan data sebagaimana dijelaskan di
          sini. Jika tidak setuju, mohon jangan menggunakan Layanan.
        </p>
      </LegalSection>

      <LegalSection title="2. Data yang kami kumpulkan">
        <LegalList>
          <li>
            <strong>Data akun:</strong> nama, alamat email, kata sandi dalam bentuk hash, status
            verifikasi email, paket dan masa aktif, serta waktu trial.
          </li>
          <li>
            <strong>Konten yang Anda unggah:</strong> dokumen PDF/TXT, teks hasil ekstraksi,
            potongan materi, pertanyaan, jawaban, dan catatan yang Anda buat.
          </li>
          <li>
            <strong>Aktivitas belajar:</strong> riwayat chat, jawaban kuis, XP, lencana, dan
            aktivitas tim seperti proyek, tugas, dan komentar.
          </li>
          <li>
            <strong>Data pembayaran:</strong> nomor pesanan, nominal, status transaksi, waktu
            pembayaran, dan identitas penyedia pembayaran. Kami <strong>tidak</strong> menyimpan
            nomor kartu, CVV, atau PIN.
          </li>
          <li>
            <strong>Data teknis:</strong> alamat IP, jenis peramban, waktu akses, dan log
            keamanan yang diperlukan untuk mencegah penyalahgunaan.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Dasar dan tujuan pemrosesan">
        <LegalList>
          <li>Menyediakan dan memelihara akun serta fitur Layanan.</li>
          <li>Menjalankan fitur AI, termasuk mencocokkan pertanyaan dengan isi dokumen Anda.</li>
          <li>Memproses pembayaran, mengaktifkan Premium, dan mencatat riwayat transaksi.</li>
          <li>Mengirim email transaksional, seperti verifikasi akun dan pemberitahuan paket.</li>
          <li>Mencegah penipuan, spam, dan penyalahgunaan kuota melalui pembatasan laju.</li>
          <li>Memenuhi kewajiban hukum, termasuk pencatatan transaksi dan permintaan otoritas.</li>
        </LegalList>
        <p>
          Kami memproses data berdasarkan pelaksanaan perjanjian layanan, persetujuan Anda pada
          fitur tertentu, kepentingan sah untuk keamanan Layanan, dan kewajiban hukum yang
          berlaku.
        </p>
      </LegalSection>

      <LegalSection title="4. Dokumen dan fitur AI">
        <p>
          Saat Anda mengunggah dokumen, sistem mengekstrak teks, memecahnya menjadi bagian kecil,
          dan membuat representasi vektor untuk pencarian. Isi dokumen serta pertanyaan Anda dapat
          dikirim ke penyedia model bahasa pihak ketiga untuk menghasilkan jawaban.
        </p>
        <p>
          Dokumen hanya dapat diakses oleh pemiliknya, anggota tim yang berhak, dan admin untuk
          keperluan moderasi. Dokumen yang belum disetujui tidak dibagikan ke pengguna lain.
        </p>
        <p>
          Jawaban AI dapat tidak akurat. Jangan mengunggah data pribadi sensitif (misalnya data
          kesehatan, keuangan, atau dokumen identitas) yang tidak diperlukan untuk belajar.
        </p>
      </LegalSection>

      <LegalSection title="5. Pembayaran">
        <p>
          Pembayaran Premium diproses oleh penyedia gateway pihak ketiga. Data pembayaran yang
          Anda masukkan diproses langsung oleh penyedia tersebut pada halaman pembayaran mereka.
          Kami hanya menerima informasi status transaksi yang diperlukan untuk mengaktifkan paket.
        </p>
        <p>
          Kami tidak menyimpan kredensial perbankan, nomor kartu, atau PIN. Untuk keperluan
          audit dan pengembalian dana, kami menyimpan nomor pesanan, nominal, status, dan waktu
          transaksi.
        </p>
      </LegalSection>

      <LegalSection title="6. Pemroses pihak ketiga">
        <p>
          Kami menggunakan penyedia layanan yang memproses data atas nama kami, dengan lingkup
          yang diperlukan untuk menjalankan Layanan:
        </p>
        <LegalList>
          <li><strong>Vercel</strong> - hosting aplikasi dan log teknis.</li>
          <li><strong>Supabase</strong> - basis data PostgreSQL dan penyimpanan data aplikasi.</li>
          <li><strong>Upstash</strong> - penghitung pembatasan laju berbasis Redis.</li>
          <li><strong>Penyedia model AI</strong> - pemrosesan teks untuk jawaban, kuis, dan pencarian semantik.</li>
          <li><strong>Resend</strong> - pengiriman email verifikasi dan pemberitahuan.</li>
          <li><strong>Cloudflare Turnstile</strong> - verifikasi bahwa pendaftaran dilakukan manusia.</li>
          <li><strong>Midtrans / Xendit</strong> - pemrosesan pembayaran.</li>
        </LegalList>
        <p>
          Sebagian penyedia tersebut beroperasi di luar Indonesia, sehingga data dapat diproses
          di luar yurisdiksi Anda. Kami tidak menjual data pribadi kepada pihak lain.
        </p>
      </LegalSection>

      <LegalSection title="7. Penyimpanan dan retensi">
        <LegalList>
          <li>Data akun disimpan selama akun aktif atau sampai Anda meminta penghapusan.</li>
          <li>Dokumen dan chat disimpan sampai Anda menghapusnya atau akun dihapus.</li>
          <li>Catatan pembayaran disimpan lebih lama untuk kewajiban audit, pajak, dan penanganan sengketa.</li>
          <li>Log keamanan dan teknis disimpan terbatas sesuai kebutuhan operasional dan kebijakan penyedia.</li>
        </LegalList>
        <p>
          Setelah masa simpan berakhir, data dihapus atau dianonimkan sejauh memungkinkan. Data
          agregat yang tidak mengidentifikasi individu dapat tetap disimpan untuk statistik.
        </p>
      </LegalSection>

      <LegalSection title="8. Hak Anda">
        <LegalList>
          <li>Meminta akses dan salinan data pribadi yang kami simpan.</li>
          <li>Meminta koreksi data yang tidak akurat atau tidak lengkap.</li>
          <li>Meminta penghapusan data, dengan catatan kewajiban hukum tertentu dapat membatasi permintaan tersebut.</li>
          <li>Menarik persetujuan untuk pemrosesan yang didasarkan pada persetujuan.</li>
          <li>Mengajukan keberatan atas pemrosesan tertentu dan meminta pembatasan.</li>
          <li>Mengajukan keluhan kepada otoritas perlindungan data yang berwenang di Indonesia.</li>
        </LegalList>
        <p>
          Permintaan dapat dikirim ke{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
          . Kami akan memverifikasi identitas pemohon sebelum memproses permintaan.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookie dan penyimpanan lokal">
        <p>
          Kami menggunakan cookie sesi yang diperlukan untuk menjaga status login. Preferensi
          tampilan dan sesi kuis disimpan di penyimpanan lokal peramban Anda. Kami tidak memakai
          cookie iklan atau pelacak pihak ketiga untuk profil pemasaran.
        </p>
      </LegalSection>

      <LegalSection title="10. Keamanan">
        <p>
          Kami menerapkan kata sandi ter-hash, sesi bertanda tangan, pembatasan laju, kontrol
          akses per peran, dan pembatasan akses basis data. Meskipun demikian, tidak ada sistem
          yang sepenuhnya bebas risiko. Jika terjadi pelanggaran data yang berdampak pada Anda,
          kami akan memberi pemberitahuan sesuai ketentuan yang berlaku.
        </p>
      </LegalSection>

      <LegalSection title="11. Usia pengguna">
        <p>
          Layanan ditujukan untuk pengguna berusia minimal 17 tahun, atau lebih muda dengan izin
          wali yang sah. Kami tidak dengan sengaja mengumpulkan data anak di bawah usia tersebut.
        </p>
      </LegalSection>

      <LegalSection title="12. Perubahan kebijakan">
        <p>
          Kami dapat memperbarui kebijakan ini. Perubahan material akan diberitahukan melalui
          aplikasi atau email. Tanggal berlaku terbaru tercantum di bagian atas halaman ini.
        </p>
      </LegalSection>

      <LegalSection title="13. Kontak">
        <p>
          Pertanyaan, permintaan data, atau keluhan dapat disampaikan ke{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
          . Dokumen terkait:{" "}
          <Link href="/legal/syarat-ketentuan" className="underline hover:text-foreground">
            Syarat &amp; Ketentuan
          </Link>
          ,{" "}
          <Link href="/legal/kebijakan-produk" className="underline hover:text-foreground">
            Kebijakan Produk
          </Link>
          , dan{" "}
          <Link
            href="/legal/kebijakan-pengembalian-dana"
            className="underline hover:text-foreground"
          >
            Kebijakan Pengembalian Dana
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
