/*
  Warnings:

  - You are about to alter the column `totalPrice` on the `Booking` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - The `status` column on the `Booking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `method` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `rawResponse` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `snapToken` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Payment` table. All the data in the column will be lost.
  - You are about to alter the column `grossAmount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - Added the required column `transactionStatus` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `midtransOrderId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "findOpponent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamName" TEXT,
ALTER COLUMN "totalPrice" SET DATA TYPE INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "method",
DROP COLUMN "rawResponse",
DROP COLUMN "snapToken",
DROP COLUMN "status",
ADD COLUMN     "paymentType" TEXT,
ADD COLUMN     "transactionStatus" TEXT NOT NULL,
ALTER COLUMN "midtransOrderId" SET NOT NULL,
ALTER COLUMN "grossAmount" SET DATA TYPE INTEGER;
