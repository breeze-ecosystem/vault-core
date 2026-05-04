-- AlterTable
ALTER TABLE "Camera" ADD COLUMN     "captureInterval" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "lastSnapshotUrl" TEXT;

-- CreateTable
CREATE TABLE "CameraPrompt" (
    "id" TEXT NOT NULL,
    "cameraId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CameraPrompt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CameraPrompt" ADD CONSTRAINT "CameraPrompt_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;
