-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "shipHomeRequestedAt" TIMESTAMP(3),
ADD COLUMN     "shipToOfficeRequestedAt" TIMESTAMP(3);
