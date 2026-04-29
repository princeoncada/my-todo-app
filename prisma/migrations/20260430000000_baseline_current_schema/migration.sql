-- Baseline the current Prisma schema after the original init migration.
-- This migration is intended to be marked as already applied on the existing
-- Supabase development database, because that database already has this shape.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS "ListItem" CASCADE;
DROP TABLE IF EXISTS "List" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TYPE "TagColor" AS ENUM ('gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink');
CREATE TYPE "ViewMatchMode" AS ENUM ('ALL', 'ANY');
CREATE TYPE "ViewType" AS ENUM ('ALL_LISTS', 'UNTAGGED', 'CUSTOM');

CREATE TABLE "List" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "listId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "color" "TagColor" NOT NULL DEFAULT 'gray',
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListTag" (
    "listId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ListTag_pkey" PRIMARY KEY ("listId", "tagId")
);

CREATE TABLE "View" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ViewType" NOT NULL DEFAULT 'CUSTOM',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "matchMode" "ViewMatchMode" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "View_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ViewList" (
    "viewId" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ViewList_pkey" PRIMARY KEY ("viewId", "listId")
);

CREATE TABLE "ViewTag" (
    "viewId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ViewTag_pkey" PRIMARY KEY ("viewId", "tagId")
);

CREATE INDEX "List_userId_idx" ON "List"("userId");
CREATE INDEX "List_userId_order_idx" ON "List"("userId", "order");

CREATE INDEX "ListItem_listId_idx" ON "ListItem"("listId");
CREATE INDEX "ListItem_listId_order_idx" ON "ListItem"("listId", "order");

CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");
CREATE INDEX "Tag_userId_name_idx" ON "Tag"("userId", "name");

CREATE INDEX "ListTag_tagId_idx" ON "ListTag"("tagId");

CREATE UNIQUE INDEX "View_userId_name_key" ON "View"("userId", "name");
CREATE INDEX "View_userId_idx" ON "View"("userId");
CREATE INDEX "View_userId_order_idx" ON "View"("userId", "order");
CREATE INDEX "View_userId_type_idx" ON "View"("userId", "type");

CREATE INDEX "ViewList_viewId_order_idx" ON "ViewList"("viewId", "order");
CREATE INDEX "ViewList_listId_idx" ON "ViewList"("listId");

CREATE INDEX "ViewTag_tagId_idx" ON "ViewTag"("tagId");

ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListTag" ADD CONSTRAINT "ListTag_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListTag" ADD CONSTRAINT "ListTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewList" ADD CONSTRAINT "ViewList_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewList" ADD CONSTRAINT "ViewList_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewTag" ADD CONSTRAINT "ViewTag_viewId_fkey" FOREIGN KEY ("viewId") REFERENCES "View"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewTag" ADD CONSTRAINT "ViewTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
