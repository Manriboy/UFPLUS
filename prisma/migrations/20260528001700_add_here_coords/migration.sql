-- AlterTable
ALTER TABLE "CanonicalProject" ADD COLUMN     "hereLat" DOUBLE PRECISION,
ADD COLUMN     "hereLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ExternalProject" ADD COLUMN     "hereLat" DOUBLE PRECISION,
ADD COLUMN     "hereLng" DOUBLE PRECISION;
