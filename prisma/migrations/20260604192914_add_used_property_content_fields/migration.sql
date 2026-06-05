-- AlterTable
ALTER TABLE "UsedProperty" ADD COLUMN     "commonExpenses" INTEGER,
ADD COLUMN     "currency" TEXT DEFAULT 'UF',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "videoUrl" TEXT;
