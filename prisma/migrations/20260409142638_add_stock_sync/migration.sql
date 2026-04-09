-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('GOOGLE_SHEETS', 'XLSX');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "StockSource" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "driveFileId" TEXT NOT NULL,
    "sheetName" TEXT,
    "fileType" "FileType" NOT NULL DEFAULT 'GOOGLE_SHEETS',
    "columnMapper" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "stockSourceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "piso" INTEGER,
    "orientacion" TEXT,
    "tipologia" TEXT,
    "supInterior" DOUBLE PRECISION,
    "supTerraza" DOUBLE PRECISION,
    "supTotal" DOUBLE PRECISION,
    "precioUf" DOUBLE PRECISION,
    "descuento" DOUBLE PRECISION,
    "bonoPie" DOUBLE PRECISION,
    "precioEstac" DOUBLE PRECISION,
    "precioBodega" DOUBLE PRECISION,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "stockSourceId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "rowsFound" INTEGER NOT NULL DEFAULT 0,
    "rowsInserted" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockSource_projectId_key" ON "StockSource"("projectId");

-- CreateIndex
CREATE INDEX "Unit_projectId_disponible_idx" ON "Unit"("projectId", "disponible");

-- CreateIndex
CREATE INDEX "Unit_projectId_tipologia_idx" ON "Unit"("projectId", "tipologia");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_stockSourceId_numero_key" ON "Unit"("stockSourceId", "numero");

-- AddForeignKey
ALTER TABLE "StockSource" ADD CONSTRAINT "StockSource_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_stockSourceId_fkey" FOREIGN KEY ("stockSourceId") REFERENCES "StockSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_stockSourceId_fkey" FOREIGN KEY ("stockSourceId") REFERENCES "StockSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
