-- AlterTable
ALTER TABLE "ExternalProject" ADD COLUMN     "address" TEXT,
ADD COLUMN     "commercialDesc" TEXT,
ADD COLUMN     "condicionesUrl" TEXT,
ADD COLUMN     "cuotasPreEntrega" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "driveUrl" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "notesHtml" TEXT,
ADD COLUMN     "paymentMethodsHtml" TEXT,
ADD COLUMN     "pie" DOUBLE PRECISION,
ADD COLUMN     "reservaCLP" INTEGER,
ADD COLUMN     "stockFileUrl" TEXT,
ADD COLUMN     "tags" TEXT[];

-- CreateTable
CREATE TABLE "ExternalUnit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "number" TEXT,
    "model" TEXT,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "m2Interior" DOUBLE PRECISION,
    "m2Terrace" DOUBLE PRECISION,
    "floor" TEXT,
    "facing" TEXT,
    "price" DOUBLE PRECISION,
    "finalPrice" DOUBLE PRECISION,
    "discountPct" DOUBLE PRECISION,
    "bonoPie" DOUBLE PRECISION,
    "planUrl" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "rawData" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalUnit_projectId_idx" ON "ExternalUnit"("projectId");

-- CreateIndex
CREATE INDEX "ExternalUnit_available_idx" ON "ExternalUnit"("available");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalUnit_source_sourceId_key" ON "ExternalUnit"("source", "sourceId");

-- AddForeignKey
ALTER TABLE "ExternalUnit" ADD CONSTRAINT "ExternalUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ExternalProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
