-- CreateTable
CREATE TABLE "ExternalProject" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT,
    "region" TEXT,
    "deliveryPeriod" TEXT,
    "deliveryYear" INTEGER,
    "stage" TEXT,
    "developerName" TEXT,
    "organizationName" TEXT,
    "priceFrom" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "typologies" TEXT[],
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalProject_source_idx" ON "ExternalProject"("source");

-- CreateIndex
CREATE INDEX "ExternalProject_commune_idx" ON "ExternalProject"("commune");

-- CreateIndex
CREATE INDEX "ExternalProject_priceFrom_idx" ON "ExternalProject"("priceFrom");

-- CreateIndex
CREATE INDEX "ExternalProject_stage_idx" ON "ExternalProject"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalProject_source_sourceId_key" ON "ExternalProject"("source", "sourceId");
