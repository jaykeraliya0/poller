-- Case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "PollType" AS ENUM ('CHOICE', 'AVAILABILITY', 'RANKING', 'RATING');

-- CreateEnum
CREATE TYPE "PollTemplate" AS ENUM ('EVENT_DATE', 'FEATURE_PRIORITY', 'OFFSITE_LOCATION', 'WORKSHOP_TOPIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ResultsVisibility" AS ENUM ('PUBLIC', 'AFTER_VOTE', 'AFTER_CLOSE', 'OWNER_ONLY');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PollType" NOT NULL,
    "template" "PollTemplate" NOT NULL DEFAULT 'CUSTOM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "closes_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "allow_vote_change" BOOLEAN NOT NULL DEFAULT true,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "require_login" BOOLEAN NOT NULL DEFAULT false,
    "results_visibility" "ResultsVisibility" NOT NULL DEFAULT 'PUBLIC',
    "expected_participants" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "voter_token" TEXT NOT NULL,
    "voter_name" TEXT,
    "comment" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "response_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("response_id","option_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "polls_slug_key" ON "polls"("slug");

-- CreateIndex
CREATE INDEX "polls_creator_id_created_at_idx" ON "polls"("creator_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "poll_options_poll_id_position_idx" ON "poll_options"("poll_id", "position");

-- CreateIndex
CREATE INDEX "responses_poll_id_created_at_idx" ON "responses"("poll_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "responses_poll_id_voter_token_key" ON "responses"("poll_id", "voter_token");

-- CreateIndex
CREATE UNIQUE INDEX "responses_poll_id_user_id_key" ON "responses"("poll_id", "user_id");

-- CreateIndex
CREATE INDEX "answers_option_id_idx" ON "answers"("option_id");

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity checks the app also validates, kept here as a last line of defence.
ALTER TABLE "polls" ADD CONSTRAINT "polls_expected_participants_positive"
    CHECK ("expected_participants" IS NULL OR "expected_participants" > 0);
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_position_non_negative"
    CHECK ("position" >= 0);
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_slot_order"
    CHECK ("starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at");
