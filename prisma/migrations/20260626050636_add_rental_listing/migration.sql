-- CreateTable
CREATE TABLE "RentalListing" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "commune" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "priceCLP" INTEGER,
    "priceUF" DOUBLE PRECISION,
    "area" INTEGER,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "thumbnail" TEXT,
    "permalink" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalListing_commune_idx" ON "RentalListing"("commune");
