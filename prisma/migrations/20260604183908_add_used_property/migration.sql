-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PENDING', 'AVAILABLE', 'BLOCKED', 'SUSPENDED', 'SOLD');

-- CreateTable
CREATE TABLE "UsedProperty" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "region" TEXT,
    "commune" TEXT,
    "sqmTotal" DOUBLE PRECISION,
    "sqmUsable" DOUBLE PRECISION,
    "sqmTerrace" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parkingSpots" INTEGER,
    "storageRooms" INTEGER,
    "totalFloors" INTEGER,
    "aptNumber" TEXT,
    "unitsPerFloor" INTEGER,
    "floorNumber" INTEGER,
    "towerNumber" TEXT,
    "propertyType" TEXT,
    "orientations" TEXT[],
    "antiquity" INTEGER,
    "amenities" TEXT[],
    "security" TEXT[],
    "securityType" TEXT,
    "services" TEXT[],
    "spaces" TEXT[],
    "special" TEXT[],
    "commonSpaces" TEXT[],
    "price" DOUBLE PRECISION,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsedProperty_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UsedProperty" ADD CONSTRAINT "UsedProperty_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
