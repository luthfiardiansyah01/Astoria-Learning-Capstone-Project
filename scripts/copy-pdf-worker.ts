// Menyalin worker pdf.js ke public/ agar bisa dimuat browser.
// Dijalankan otomatis oleh postinstall, predev, dan prebuild.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const source = join(process.cwd(), "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const targetDir = join(process.cwd(), "public");
const target = join(targetDir, "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.warn("[pdf-worker] pdfjs-dist belum terpasang; worker dilewati.");
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log("[pdf-worker] public/pdf.worker.min.mjs siap.");
