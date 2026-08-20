-- AlterTable
ALTER TABLE "users" ADD COLUMN     "copilot_message_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "copilot_window_started_at" TIMESTAMP(3);
