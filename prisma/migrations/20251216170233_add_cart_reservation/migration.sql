-- CreateTable
CREATE TABLE "CartReservation" (
    "id" SERIAL NOT NULL,
    "masterId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reservedByUserId" INTEGER NOT NULL,

    CONSTRAINT "CartReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartReservation_masterId_date_time_key" ON "CartReservation"("masterId", "date", "time");

-- AddForeignKey
ALTER TABLE "CartReservation" ADD CONSTRAINT "CartReservation_reservedByUserId_fkey" FOREIGN KEY ("reservedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
