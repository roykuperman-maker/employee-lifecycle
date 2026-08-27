-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "offboardMilestonesSent" TEXT,
ADD COLUMN     "orientationInviteSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "welcomeLinksSent" BOOLEAN NOT NULL DEFAULT false;
