-- ID perangkat stabil per peramban, dikirim saat login.
ALTER TABLE "User" ADD COLUMN "activeDeviceId" TEXT;
