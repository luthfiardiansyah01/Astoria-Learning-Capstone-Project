import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Kebijakan Pengembalian Dana — SOBAT ADI",
  description:
    "Kebijakan pengembalian dana Paket Premium SOBAT ADI: kondisi yang dapat diajukan, proses, waktu, dan pengecualian.",
};

export default function RefundPage() {
  return (
    <LegalPage
      title="Kebijakan Pengembalian Dana"
      description="Ketentuan pengembalian dana Paket Premium SOBAT ADI, termasuk kondisi yang dapat diajukan dan proses verifikasinya."
    >
      <LegalSection title="1. Prinsip umum">
        <LegalList>
          <li>Premium adalah layanan digital yang dapat diakses langsung setelah pembayaran dikonfirmasi.</li>
          <li>Trial 7 hari gratis dan tidak menimbulkan tagihan, sehingga tidak ada dana yang dikembalikan.</li>
          <li>Pembayaran berlaku untuk satu periode 30 hari dan tidak diperpanjang otomatis.</li>
          <li>Pengembalian diberikan untuk kasus di bawah setelah verifikasi.</li>
          <li>Kebijakan ini tidak mengurangi hak konsumen yang dijamin hukum Republik Indonesia.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="2. Kondisi yang dapat diajukan">
        <LegalList>
          <li>Pembayaran ganda untuk pesanan yang sama.</li>
          <li>Pembayaran berhasil, tetapi Premium tidak aktif lebih dari 1×24 jam setelah bukti pembayaran diberikan.</li>
          <li>Transaksi tidak sah tanpa izin pemilik metode pembayaran, setelah verifikasi.</li>
          <li>Gangguan material Layanan Premium lebih dari 72 jam dalam 7 hari pertama dan tidak ada perbaikan atau alternatif yang wajar.</li>
          <li>Kewajiban hukum yang berlaku mewajibkan pengembalian.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="3. Kondisi yang umumnya tidak dapat dikembalikan">
        <LegalList>
          <li>Berubah pikiran setelah memperoleh dan menggunakan manfaat Premium.</li>
          <li>Pengembalian sebagian untuk sisa periode, kecuali diwajibkan hukum.</li>
          <li>Akun ditangguhkan karena pelanggaran Syarat dan Ketentuan.</li>
          <li>Gangguan akibat perangkat, jaringan, atau tindakan pengguna.</li>
          <li>Kuota AI habis karena pemakaian normal.</li>
          <li>Kekurangan hasil belajar atau nilai akademik.</li>
          <li>Biaya gateway atau bank yang tidak dapat dikembalikan penyedia.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. Cara mengajukan">
        <p>
          Kirim email ke{" "}
          <a href="mailto:admin@sobat-adi.id" className="underline hover:text-foreground">
            admin@sobat-adi.id
          </a>{" "}
          dengan subjek <strong>Refund — [Order ID]</strong> dan sertakan:
        </p>
        <LegalList>
          <li>nama dan email akun;</li>
          <li>Order ID atau bukti pembayaran;</li>
          <li>tanggal dan nominal pembayaran;</li>
          <li>metode pembayaran;</li>
          <li>alasan pengajuan;</li>
          <li>bukti pendukung berupa tangkapan layar, struk, atau mutasi.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Proses dan waktu">
        <LegalList>
          <li>Konfirmasi penerimaan dalam 3 hari kerja.</li>
          <li>Keputusan dalam 7 hari kerja setelah dokumen lengkap.</li>
          <li>Pengembalian diproses ke metode pembayaran asal melalui gateway atau transfer.</li>
          <li>Dana umumnya diterima dalam 7–14 hari kerja setelah persetujuan, tergantung bank/gateway.</li>
          <li>Jika ditolak, kami memberikan alasan tertulis.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="6. Pembayaran manual">
        <p>
          Untuk transfer manual, pengembalian dilakukan ke rekening asal yang namanya sesuai dengan
          pemilik akun. Biaya transfer menjadi tanggungan pengguna, kecuali diwajibkan lain oleh
          hukum. Pengguna wajib memberikan bukti transfer dan data rekening yang benar.
        </p>
      </LegalSection>

      <LegalSection title="7. Sengketa pembayaran">
        <p>
          Hubungi kami terlebih dahulu sebelum mengajukan chargeback. Akun Premium dapat
          ditangguhkan sementara selama pemeriksaan. Jika chargeback terbukti tidak sah, pengguna
          bertanggung jawab atas biaya sengketa yang timbul.
        </p>
      </LegalSection>

      <LegalSection title="8. Perubahan kebijakan">
        <p>
          Kami dapat memperbarui kebijakan ini. Perubahan berlaku untuk transaksi setelah tanggal
          berlaku baru. Transaksi yang sudah selesai mengikuti kebijakan yang berlaku saat
          transaksi dilakukan.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
