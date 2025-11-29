/*
  Warnings:

  - A unique constraint covering the columns `[midtransOrderId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "midtransOrderId" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Booking_midtransOrderId_key" ON "Booking"("midtransOrderId");
