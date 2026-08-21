-- CreateEnum
CREATE TYPE "CopilotMessageRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "copilot_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copilot_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "CopilotMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "copilot_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "copilot_conversations_user_id_updated_at_idx" ON "copilot_conversations"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "copilot_messages_conversation_id_created_at_idx" ON "copilot_messages"("conversation_id", "created_at");

-- AddForeignKey
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "copilot_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
