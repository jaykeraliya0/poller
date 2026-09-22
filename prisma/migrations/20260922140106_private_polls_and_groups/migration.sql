-- CreateEnum
CREATE TYPE "PollVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "polls" ADD COLUMN     "visibility" "PollVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "poll_invites" (
    "id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id","email")
);

-- CreateTable
CREATE TABLE "poll_groups" (
    "poll_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_groups_pkey" PRIMARY KEY ("poll_id","group_id")
);

-- CreateIndex
CREATE INDEX "poll_invites_email_idx" ON "poll_invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "poll_invites_poll_id_email_key" ON "poll_invites"("poll_id", "email");

-- CreateIndex
CREATE INDEX "groups_owner_id_created_at_idx" ON "groups"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "groups_owner_id_name_key" ON "groups"("owner_id", "name");

-- CreateIndex
CREATE INDEX "group_members_email_idx" ON "group_members"("email");

-- CreateIndex
CREATE INDEX "poll_groups_group_id_idx" ON "poll_groups"("group_id");

-- AddForeignKey
ALTER TABLE "poll_invites" ADD CONSTRAINT "poll_invites_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_groups" ADD CONSTRAINT "poll_groups_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_groups" ADD CONSTRAINT "poll_groups_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
