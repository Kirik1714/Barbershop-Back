/*
  Warnings:

  - Added the required column `serviceId` to the `CartReservation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartReservation" ADD COLUMN     "serviceId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "CartReservation" ADD CONSTRAINT "CartReservation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
