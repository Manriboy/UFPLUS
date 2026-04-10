/*
  Warnings:

  - You are about to drop the column `precioBodega` on the `Unit` table. All the data in the column will be lost.
  - You are about to drop the column `precioEstac` on the `Unit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StockSource" ADD COLUMN     "bonoPieIndividual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bonoPieValor" DOUBLE PRECISION,
ADD COLUMN     "descuentoIndividual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "descuentoValor" DOUBLE PRECISION,
ADD COLUMN     "headerRow" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "precioBodegaFijo" DOUBLE PRECISION,
ADD COLUMN     "precioEstacFijo" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Unit" DROP COLUMN "precioBodega",
DROP COLUMN "precioEstac";
