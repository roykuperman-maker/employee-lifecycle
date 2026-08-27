-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "delivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveredNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "lineOptionChosen" TEXT,
ADD COLUMN     "lineOptionChosenAt" TIMESTAMP(3),
ADD COLUMN     "requestType" TEXT,
ADD COLUMN     "requesterEmail" TEXT,
ADD COLUMN     "requesterName" TEXT,
ADD COLUMN     "simNumber" TEXT;
