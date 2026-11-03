// Setup global unit test: pastikan tidak ada kredensial nyata yang terpakai.
process.env.TZ = "Asia/Jakarta";

// Rate limit harus memakai fallback memori, bukan Upstash produksi.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// Jangan biarkan unit test memakai kunci gateway sungguhan.
delete process.env.MIDTRANS_SERVER_KEY;
delete process.env.MIDTRANS_CLIENT_KEY;
delete process.env.MIDTRANS_IS_PRODUCTION;
delete process.env.XENDIT_SECRET_KEY;
delete process.env.XENDIT_CALLBACK_TOKEN;
delete process.env.PAYMENT_PROVIDER;
delete process.env.NEXT_PUBLIC_APP_URL;
delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
delete process.env.VERCEL_URL;
