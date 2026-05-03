/*
  Warnings:

  - You are about to drop the column `order` on the `List` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,name]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[viewId,order]` on the table `ViewList` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "List_userId_order_idx";

-- AlterTable
ALTER TABLE "List" DROP COLUMN "order";

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ViewList_viewId_order_key" ON "ViewList"("viewId", "order");
