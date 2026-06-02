-- AlterTable
ALTER TABLE "ExternalProject" ADD COLUMN     "canonicalId" TEXT;

-- CreateTable
CREATE TABLE "CanonicalProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "deliveryPeriod" TEXT,
    "deliveryYear" INTEGER,
    "stage" TEXT,
    "developerName" TEXT,
    "priceFrom" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "typologies" TEXT[],
    "description" TEXT,
    "commercialDesc" TEXT,
    "paymentMethodsHtml" TEXT,
    "condicionesUrl" TEXT,
    "notesHtml" TEXT,
    "pie" DOUBLE PRECISION,
    "reservaCLP" INTEGER,
    "cuotasPreEntrega" INTEGER,
    "tags" TEXT[],
    "sources" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanonicalProject_commune_idx" ON "CanonicalProject"("commune");

-- CreateIndex
CREATE INDEX "CanonicalProject_priceFrom_idx" ON "CanonicalProject"("priceFrom");

-- AddForeignKey
ALTER TABLE "ExternalProject" ADD CONSTRAINT "ExternalProject_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES "CanonicalProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
