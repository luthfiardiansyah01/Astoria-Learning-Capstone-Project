import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan — SOBAT ADI",
  description:
    "Syarat dan ketentuan penggunaan SOBAT ADI, termasuk akun, trial Premium, pembayaran, konten pengguna, dan batasan layanan AI.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Syarat dan Ketentuan"
      description="Aturan penggunaan layanan SOBAT ADI, termasuk akun, trial Premium, pembayaran, dan konten pengguna."
    >
      <LegalSection title="1. Persetujuan">
        <p>
          Dengan mendaftar, mengakses, atau menggunakan SOBAT ADI, Anda menyetujui Syarat dan
          Ketentuan ini, Kebijakan Produk, dan Kebijakan Pengembalian Dana. Jika tidak setuju,
          jangan menggunakan layanan.
        </p>
        <p>
          Jika Anda menggunakan layanan atas nama organisasi, Anda menyatakan berwenang mengikat
          organisasi tersebut.
        </p>
      </LegalSection>

      <LegalSection title="2. Akun dan kelayakan">
        <LegalList>
          <li>Anda harus berusia minimal 17 tahun atau mendapat izin wali yang sah.</li>
          <li>Data yang didaftarkan harus benar, lengkap, dan terkini.</li>
          <li>Kata sandi bersifat rahasia dan menjadi tanggung jawab Anda.</li>
          <li>Satu akun hanya untuk satu orang dan tidak boleh dibagikan atau diperjualbelikan.</li>
          <li>Trial Premium hanya berlaku sekali per akun.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Lisensi penggunaan">
        <p>
          Kami memberikan lisensi terbatas, non-eksklusif, tidak dapat dialihkan, dan dapat dicabut
          untuk menggunakan Layanan bagi keperluan belajar pribadi atau kolaborasi yang sah.
        </p>
        <LegalList>
          <li>Dilarang menyalin, menjual, atau menyewakan Layanan.</li>
          <li>Dilarang melakukan reverse engineering atau mengakses kode sumber.</li>
          <li>Dilarang mengotomatiskan pengambilan data secara masif.</li>
          <li>Dilarang melewati kuota, autentikasi, atau kontrol akses.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Trial, paket, dan pembayaran">
        <LegalList>
          <li>Paket Free dapat digunakan tanpa biaya dengan batas yang berlaku.</li>
          <li>Trial Premium 7 hari diberikan otomatis kepada akun baru dan pengguna Free yang memenuhi syarat, sekali per akun.</li>
          <li>Selama trial, fitur Premium terbuka, tetapi kuota AI tetap dibatasi.</li>
          <li>Setelah trial berakhir, akun kembali ke Free tanpa penagihan otomatis.</li>
          <li>Premium dijual per 30 hari dengan harga yang ditampilkan di aplikasi, saat ini Rp19.000.</li>
          <li>Pembayaran diproses gateway pihak ketiga (Midtrans/Xendit); kami tidak menyimpan data kartu lengkap.</li>
          <li>Tidak ada perpanjangan otomatis. Pengguna harus memperpanjang sendiri.</li>
          <li>Harga dapat berubah dengan pemberitahuan yang wajar dan tidak berlaku surut.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Kuota AI dan penggunaan wajar">
        <LegalList>
          <li>Kuota dihitung per akun, bukan per perangkat.</li>
          <li>Kuota harian direset setiap 00.00 WIB; kuota per menit berlaku terpisah.</li>
          <li>Batas Paket Free dan Premium dijelaskan pada Kebijakan Produk.</li>
          <li>Penyalahgunaan, berbagi akun, atau upaya melewati kuota dapat menyebabkan pembatasan.</li>
          <li>Kuota penyedia AI pihak ketiga terpisah dari kuota aplikasi.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Konten pengguna">
        <LegalList>
          <li>Anda tetap memiliki hak atas dokumen dan konten yang diunggah.</li>
          <li>Anda memberi kami izin terbatas untuk menyimpan, memproses, memecah, dan mengindeks konten guna menjalankan Layanan.</li>
          <li>Anda menjamin memiliki hak atas materi yang diunggah dan tidak melanggar hak pihak lain.</li>
          <li>Kami dapat meninjau, menolak, atau menghapus konten yang melanggar hukum atau syarat ini.</li>
          <li>Dokumen dapat dipakai pengguna lain hanya jika disetujui untuk dibagikan atau melalui fitur kolaborasi.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="7. Kecerdasan artifisial dan integritas akademik">
        <LegalList>
          <li>Mentor AI dapat menghasilkan jawaban yang tidak akurat atau tidak lengkap.</li>
          <li>Jawaban AI bukan pengganti penilaian dosen, tutor, atau sumber akademik resmi.</li>
          <li>Anda bertanggung jawab memverifikasi informasi penting.</li>
          <li>Layanan tidak boleh digunakan untuk menyalin jawaban ujian atau melanggar aturan kampus.</li>
          <li>Kami tidak menjamin nilai, kelulusan, atau hasil akademik tertentu.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="8. Kekayaan intelektual">
        <p>
          Selain konten pengguna, seluruh elemen Layanan — perangkat lunak, desain, merek, logo,
          teks, dan materi — dimiliki oleh kami atau pemberi lisensinya dan dilindungi hukum. Merek
          dan logo tidak boleh digunakan tanpa izin tertulis.
        </p>
      </LegalSection>

      <LegalSection title="9. Privasi dan data">
        <p>
          Kami memproses data yang diperlukan untuk menyediakan Layanan: nama, email, aktivitas
          belajar, dokumen, metadata pembayaran, serta data teknis dan log keamanan. Data dapat
          diproses oleh penyedia infrastruktur, basis data, AI, dan pembayaran yang bekerja untuk
          kami. Kami tidak menjual data pribadi.
        </p>
        <p>
          Anda dapat meminta akses, koreksi, atau penghapusan data melalui{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Ketersediaan dan perubahan layanan">
        <LegalList>
          <li>Kami berupaya menjaga Layanan tersedia, tetapi tidak menjamin tanpa gangguan.</li>
          <li>Pemeliharaan, pembaruan, atau perubahan fitur dapat dilakukan.</li>
          <li>Fitur eksperimental dapat diubah atau dihentikan.</li>
          <li>Jika Layanan dihentikan permanen, pengguna Premium dapat mengajukan pengembalian sesuai kebijakan.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="11. Penangguhan dan penghentian">
        <p>
          Kami dapat menangguhkan atau menghentikan akun yang melanggar syarat, melakukan penipuan,
          membahayakan keamanan Layanan, atau melanggar hukum. Anda dapat berhenti menggunakan
          Layanan kapan saja dan meminta penghapusan akun melalui email.
        </p>
      </LegalSection>

      <LegalSection title="12. Penafian dan batas tanggung jawab">
        <p>
          Layanan disediakan “sebagaimana adanya” dan “sebagaimana tersedia” sejauh diizinkan
          hukum. Kami tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau
          konsekuensial, termasuk kehilangan data atau keuntungan, sejauh diizinkan hukum.
        </p>
        <p>
          Tidak ada ketentuan dalam dokumen ini yang menghapus hak konsumen yang dijamin hukum
          yang berlaku.
        </p>
      </LegalSection>

      <LegalSection title="13. Ganti rugi">
        <p>
          Anda setuju mengganti kerugian kami atas klaim pihak ketiga yang timbul dari pelanggaran
          Anda terhadap syarat ini, konten yang Anda unggah, atau penggunaan Layanan yang melanggar
          hukum.
        </p>
      </LegalSection>

      <LegalSection title="14. Hukum yang berlaku dan sengketa">
        <p>
          Dokumen ini diatur oleh hukum Republik Indonesia. Sengketa diupayakan diselesaikan
          secara musyawarah melalui {CONTACT_EMAIL}. Jika tidak selesai, para pihak dapat
          menempuh mekanisme penyelesaian sengketa menurut hukum Indonesia.
        </p>
      </LegalSection>

      <LegalSection title="15. Perubahan dan kontak">
        <p>
          Kami dapat memperbarui syarat ini. Perubahan material akan diberitahukan melalui aplikasi
          atau email. Penggunaan Layanan setelah tanggal berlaku perubahan berarti Anda menyetujui
          versi terbaru.
        </p>
        <p>
          SOBAT ADI ·{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-foreground">
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
