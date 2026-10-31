// Dokumen modul contoh + metadata, dipakai seed dev maupun seed produksi.

export const SAMPLE_DOC_FILE_NAME = "modul-sistem-informasi-manajemen.txt";

export const SAMPLE_DOC = `MODUL SISTEM INFORMASI MANAJEMEN (SIM)
Universitas Terbuka — Pendidikan Jarak Jauh

BAB 1 PENDAHULUAN

1.1 Latar Belakang
Sistem informasi manajemen merupakan penggabungan antara sistem informasi dan manajemen untuk mendukung pengambilan keputusan di organisasi. Dalam era digital, sistem informasi menjadi tulang punggung operasional perusahaan dan institusi pendidikan. Pemahaman SIM mutlak diperlukan oleh mahasiswa sebagai bekal menghadapi dunia kerja yang serba terkomputerisasi.

1.2 Tujuan Pembelajaran
Setelah mempelajari modul ini, mahasiswa diharapkan mampu menjelaskan konsep dasar sistem informasi manajemen, membedakan jenis-jenis sistem informasi, serta menganalisis kebutuhan sistem informasi pada organisasi nyata.

BAB 2 KONSEP DASAR SISTEM INFORMASI

2.1 Definisi Sistem Informasi
Sistem informasi adalah kombinasi terorganisasi dari manusia, perangkat keras (hardware), perangkat lunak (software), jaringan komunikasi, dan sumber daya data yang bekerja bersama untuk mengumpulkan, mengubah, dan menyebarkan informasi dalam suatu organisasi. Komponen-komponen tersebut saling terkait: manusia mengoperasikan hardware, software mengolah data, dan jaringan menghubungkan semuanya.

2.2 Data, Informasi, dan Pengetahuan
Data adalah fakta mentah yang belum diolah. Ketika data diolah dan diberi konteks, ia menjadi informasi yang bermakna. Pengetahuan muncul ketika informasi dipahami dan dimanfaatkan untuk mengambil keputusan. Sebagai contoh: angka penjualan harian adalah data; laporan tren penjualan bulanan adalah informasi; strategi diskon berdasarkan pola musiman adalah pengetahuan.

2.3 Karakteristik Informasi Berkualitas
Informasi yang baik harus akurat, relevan, tepat waktu, lengkap, dan ekonomis. Informasi yang terlambat kehilangan nilainya, sebagaimana informasi yang tidak relevan dengan kebutuhan pengambil keputusan.

BAB 3 JENIS-JENIS SISTEM INFORMASI

3.1 Sistem Pengolahan Transaksi (TPS)
TPS adalah sistem yang memproses data transaksi operasional sehari-hari seperti penjualan, pembelian, dan inventori. TPS menjadi fondasi bagi sistem informasi lain karena menghasilkan data mentah yang siap diolah lebih lanjut.

3.2 Sistem Informasi Manajemen (MIS)
MIS menyajikan laporan terstruktur dan ringkasan dari data TPS untuk membantu manajer tingkat menengah dalam pemantauan dan pengendalian. Laporan penjualan bulanan per wilayah adalah contoh keluaran MIS.

3.3 Sistem Pendukung Keputusan (DSS)
DSS membantu manajer tingkat atas menganalisis situasi semi-terstruktur menggunakan model analitik, simulasi, dan data internal maupun eksternal. DSS tidak menggantikan manajer, melainkan memperkaya pertimbangan mereka.

3.4 Sistem Pakar dan Kecerdasan Buatan
Sistem pakar meniru penalaran pakar manusia dalam domain sempit. Perkembangan kecerdasan buatan modern memperluas kemampuan ini menjadi sistem yang mampu memahami bahasa alami dan belajar dari data.

BAB 4 ARSITEKTUR SISTEM AI BERBASIS DOKUMEN

4.1 Pengantar Arsitektur Berbasis Dokumen
Arsitektur sistem AI berbasis dokumen memungkinkan aplikasi kecerdasan buatan menjawab pertanyaan secara akurat dengan bersandar pada korpus dokumen resmi, bukan hanya pada pengetahuan yang tersimpan dalam parameter model. Pendekatan ini mengurangi risiko halusinasi dan memudahkan pembaruan pengetahuan tanpa melatih ulang model.

4.2 RAG (Retrieval-Augmented Generation)
RAG adalah teknik yang menggabungkan kemampuan pencarian informasi (retrieval) dengan model bahasa generatif. Alih-alih hanya mengandalkan pengetahuan yang tersimpan dalam parameter model, RAG memungkinkan sistem untuk membaca dokumen eksternal secara real-time sebelum menjawab. Dalam konteks Sistem Informasi Manajemen, RAG sangat relevan karena memastikan jawaban yang diberikan selalu akurat dan dapat diverifikasi dari sumber resmi, bukan sekadar halusinasi model AI.

Tiga tahap kerja RAG adalah: retrieval, augmentation, dan generation. Pada tahap retrieval, sistem mencari potongan teks paling relevan dari dokumen berdasarkan pertanyaan pengguna. Pada tahap augmentation, teks tersebut ditambahkan ke konteks prompt model bahasa. Pada tahap generation, model menghasilkan jawaban berdasarkan konteks tersebut.

4.3 Perbandingan RAG dan Fine-tuning
RAG unggul ketika dokumen sering diperbarui karena pengetahuan cukup diubah pada korpus dokumen tanpa melatih ulang model. Fine-tuning lebih cocok untuk menanamkan gaya atau format khusus. Biaya RAG jauh lebih rendah karena tidak memerlukan proses pelatihan, sementara fine-tuning membutuhkan sumber daya komputasi besar.

4.4 Embedding dan Pencarian Semantik
Embedding adalah representasi vektor numerik dari teks yang menangkap makna semantik. Pencarian semantik membandingkan vektor pertanyaan dengan vektor potongan dokumen menggunakan cosine similarity, sehingga menemukan konteks yang relevan meski kata kunci tidak persis sama.

BAB 5 MANAJEMEN PROYEK SISTEM INFORMASI

5.1 Siklus Hidup Pengembangan Sistem
Pengembangan sistem informasi mengikuti siklus hidup (SDLC): perencanaan, analisis, perancangan, implementasi, pengujian, dan pemeliharaan. Setiap tahap menghasilkan keluaran yang menjadi masukan tahap berikutnya.

5.2 Peran Manusia dalam Sistem Informasi
Manusia tetap komponen paling menentukan: manajer mendefinisikan kebutuhan, analis sistem menerjemahkannya, pengembang membangun solusi, dan pengguna akhir memastikan sistem benar-benar menyelesaikan masalah. Teknologi terbaik pun gagal tanpa manajemen perubahan yang baik.

5.3 Etika dan Keamanan Informasi
Keamanan informasi mencakup kerahasiaan, integritas, dan ketersediaan data. Praktik etika mencakup penggunaan data secara bertanggung jawab, menghormasi privasi pengguna, dan transparansi dalam pengambilan keputusan berbasis algoritma. Setiap organisasi wajib menetapkan kebijakan keamanan yang jelas dan melatih karyawannya.

BAB 6 PENUTUP

Modul ini menegaskan bahwa sistem informasi manajemen bukan sekadar teknologi, melainkan kesatuan manusia, proses, dan teknologi untuk mendukung keputusan. Mahasiswa didorong melanjutkan eksplorasi dengan mempraktikkan analisis sistem pada organisasi nyata.`;

export const SAMPLE_DOC_METADATA = {
  judul_dokumen: "Modul Sistem Informasi Manajemen (SIM)",
  ringkasan:
    "Modul pembelajaran Sistem Informasi Manajemen untuk mahasiswa PJJ yang membahas konsep dasar SIM, jenis-jenis sistem informasi, arsitektur AI berbasis dokumen (RAG), hingga manajemen proyek sistem informasi.",
  topik_utama: ["Sistem Informasi", "Manajemen", "RAG", "SDLC", "Keamanan Informasi"],
  struktur: [
    { bab: "Bab 1", judul: "Pendahuluan", subtopik: ["Latar Belakang", "Tujuan Pembelajaran"] },
    { bab: "Bab 2", judul: "Konsep Dasar Sistem Informasi", subtopik: ["Definisi", "Data vs Informasi", "Karakteristik Informasi"] },
    { bab: "Bab 3", judul: "Jenis-Jenis Sistem Informasi", subtopik: ["TPS", "MIS", "DSS", "Sistem Pakar"] },
    { bab: "Bab 4", judul: "Arsitektur Sistem AI Berbasis Dokumen", subtopik: ["RAG", "Fine-tuning", "Embedding"] },
    { bab: "Bab 5", judul: "Manajemen Proyek Sistem Informasi", subtopik: ["SDLC", "Peran Manusia", "Etika & Keamanan"] },
    { bab: "Bab 6", judul: "Penutup", subtopik: [] },
  ],
  kata_kunci: ["sistem informasi", "RAG", "SDLC", "TPS", "keamanan"],
  estimasi_tingkat_kesulitan: "Menengah",
  mata_kuliah_terkait: "Sistem Informasi Manajemen",
};

export const SAMPLE_DOC_MODERATION = {
  layak: true,
  skor_kualitas: 92,
  alasan: "Materi akademik terstruktur, relevan dengan mata kuliah Sistem Informasi, bahasa Indonesia yang baik.",
  tag_otomatis: ["sistem-informasi", "akademik", "modul-ut"],
  rekomendasi_admin: "Aktifkan langsung",
};

/** Potongan dokumen per BAB + kata kunci untuk pencarian kata kunci. */
export function buildSampleChunks() {
  const parts = SAMPLE_DOC.split(/(?=BAB \d)/g);
  return parts.map((part, index) => {
    const content = part.trim();
    return {
      content,
      chunkIndex: index,
      keywords: content
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
        .join(" "),
    };
  });
}
