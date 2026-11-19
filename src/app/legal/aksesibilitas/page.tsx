import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Pernyataan Aksesibilitas - SOBAT ADI",
  description:
    "Komitmen SOBAT ADI terhadap aksesibilitas: standar WCAG 2.2 AA, fitur yang tersedia, keterbatasan yang diketahui, dan cara menyampaikan umpan balik.",
};

export default function AccessibilityStatementPage() {
  return (
    <LegalPage
      title="Pernyataan Aksesibilitas"
      description="Komitmen kami agar SOBAT ADI dapat digunakan oleh mahasiswa dengan beragam kebutuhan, termasuk penyandang disabilitas."
      version="1.0"
      effectiveDate="19 November 2026"
      kicker="Informasi Aksesibilitas"
    >
      <LegalSection title="1. Komitmen">
        <p>
          SOBAT ADI berkomitmen menyediakan layanan belajar yang dapat digunakan oleh semua
          mahasiswa, termasuk penyandang disabilitas. Kami memandang aksesibilitas sebagai bagian
          dari kualitas produk, bukan fitur tambahan.
        </p>
        <p>
          Pernyataan ini berlaku untuk aplikasi web SOBAT ADI, termasuk Beranda, Mentor AI,
          Unggah, Kuis, Collab, Akun, dan halaman publik.
        </p>
      </LegalSection>

      <LegalSection title="2. Standar yang kami ikuti">
        <p>
          Kami menargetkan <strong>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</strong>.
          Standar ini mencakup konten yang dapat dipahami, dioperasikan, dan dibaca oleh teknologi
          bantu, serta kontras warna yang memadai.
        </p>
        <p>
          Kami juga merujuk pada UU No. 8 Tahun 2016 tentang Penyandang Disabilitas, khususnya hak
          atas aksesibilitas layanan publik dan informasi.
        </p>
      </LegalSection>

      <LegalSection title="3. Fitur aksesibilitas yang tersedia">
        <LegalList>
          <li>
            <strong>Navigasi keyboard:</strong> seluruh menu dan tombol utama dapat dicapai dengan
            Tab, diaktifkan dengan Enter atau Spasi, dan dialog ditutup dengan Escape.
          </li>
          <li>
            <strong>Lewati navigasi:</strong> tautan &ldquo;Lewati ke konten utama&rdquo; muncul
            saat fokus keyboard berada di awal halaman.
          </li>
          <li>
            <strong>Pembaca layar:</strong> judul halaman, label formulir, nama tombol, status
            dinamis, dan pesan kesalahan disediakan untuk teknologi bantu.
          </li>
          <li>
            <strong>Target sentuh:</strong> kontrol utama pada layar kecil memiliki ukuran minimal
            44 x 44 piksel.
          </li>
          <li>
            <strong>Gerak minimal:</strong> animasi dan transisi dinonaktifkan bila perangkat
            mengaktifkan preferensi pengurangan gerak.
          </li>
          <li>
            <strong>Tampilan:</strong> tata letak responsif hingga lebar 375 piksel, teks dapat
            diperbesar, dan tersedia mode gelap.
          </li>
          <li>
            <strong>Panduan aplikasi:</strong> tur enam langkah dengan navigasi tombol dan panah
            keyboard, dapat dibuka dari menu Panduan.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Cara memakai dengan teknologi bantu">
        <LegalList>
          <li>Tekan Tab untuk berpindah antar kontrol dan Shift+Tab untuk kembali.</li>
          <li>Gunakan Enter atau Spasi untuk mengaktifkan tombol dan tautan.</li>
          <li>Pada dialog, fokus tetap berada di dalam dialog sampai ditutup dengan Escape.</li>
          <li>Pada panduan, gunakan panah kiri dan kanan untuk berpindah langkah.</li>
          <li>
            Pembaca layar akan mengumumkan perpindahan tampilan, misalnya &ldquo;Mentor AI
            aktif&rdquo;.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Hasil audit terakhir">
        <p>
          Pada 19 November 2026 kami menjalankan audit otomatis dengan axe-core terhadap sepuluh
          halaman: Login, Beranda (desktop dan mobile), Mentor AI, Unggah, Kuis, Collab, Akun,
          Pernyataan Aksesibilitas, dan Kebijakan Privasi. Hasil akhirnya{" "}
          <strong>nol pelanggaran</strong> pada tag WCAG 2.2 A dan AA.
        </p>
        <p>
          Kami juga menguji TalkBack pada perangkat Android. TalkBack membaca judul, tombol, dan
          tautan utama. Pengujian penelusuran fokus secara menyeluruh masih berlangsung.
        </p>
      </LegalSection>

      <LegalSection title="6. Keterbatasan yang diketahui">
        <LegalList>
          <li>
            Audit otomatis hanya mencakup sebagian jenis masalah. Uji manual dengan pembaca layar
            dan pengguna disabilitas masih diperlukan.
          </li>
          <li>
            Dokumen PDF yang Anda unggah mungkin tidak memiliki tag aksesibilitas, sehingga kualitas
            pembacaan bergantung pada dokumen tersebut.
          </li>
          <li>
            Halaman pembayaran pihak ketiga, seperti Midtrans atau Xendit, memiliki aksesibilitas
            di luar kendali langsung kami.
          </li>
          <li>
            Beberapa alur, seperti pembayaran dan unggah berkas besar, belum diuji dengan pengguna
            disabilitas nyata.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Umpan balik dan bantuan">
        <p>
          Jika Anda mengalami hambatan, membutuhkan materi dalam format lain, atau ingin melaporkan
          masalah aksesibilitas, kirimkan pesan ke{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          Sertakan halaman, langkah yang Anda lakukan, teknologi bantu yang dipakai, dan perangkat
          bila memungkinkan. Kami menargetkan tanggapan awal dalam 5 hari kerja dan akan
          menyampaikan alternatif sementara bila perbaikan memerlukan waktu.
        </p>
      </LegalSection>

      <LegalSection title="8. Peninjauan">
        <p>
          Pernyataan ini ditinjau minimal setiap enam bulan atau setelah perubahan besar pada
          antarmuka. Versi dan tanggal berlaku tercantum di bagian atas halaman.
        </p>
        <p>
          Dokumen terkait:{" "}
          <Link href="/legal/kebijakan-privasi" className="underline hover:text-foreground">
            Kebijakan Privasi
          </Link>
          ,{" "}
          <Link href="/legal/syarat-ketentuan" className="underline hover:text-foreground">
            Syarat &amp; Ketentuan
          </Link>
          , dan{" "}
          <Link href="/legal/kebijakan-produk" className="underline hover:text-foreground">
            Kebijakan Produk
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
