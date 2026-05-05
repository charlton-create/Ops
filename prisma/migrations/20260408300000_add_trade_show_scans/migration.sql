-- CreateTable
CREATE TABLE "trade_show_scans" (
    "id" SERIAL NOT NULL,
    "rawData" TEXT NOT NULL,
    "parsedData" JSONB,
    "source" TEXT,
    "scannedBy" TEXT,
    "leadId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trade_show_scans_pkey" PRIMARY KEY ("id")
);
