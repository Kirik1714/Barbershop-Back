/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "time" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "MasterSchedule" (
    "id" SERIAL NOT NULL,
    "masterId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "MasterSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDayOff" (
    "id" SERIAL NOT NULL,
    "masterId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDayOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "MasterSchedule" ADD CONSTRAINT "MasterSchedule_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterDayOff" ADD CONSTRAINT "MasterDayOff_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
