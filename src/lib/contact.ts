// Kontak bisnis publik. Ubah lewat NEXT_PUBLIC_CONTACT_EMAIL tanpa menyentuh kode.
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "admin1@moedatrace.com";

export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
