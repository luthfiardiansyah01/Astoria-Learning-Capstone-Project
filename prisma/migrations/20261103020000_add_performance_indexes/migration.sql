-- Indeks untuk mempercepat query yang sering dipakai halaman & API.
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");

CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

CREATE INDEX "TaskChatMessage_taskId_idx" ON "TaskChatMessage"("taskId");

CREATE INDEX "ActivityEvent_teamId_createdAt_idx" ON "ActivityEvent"("teamId", "createdAt");
CREATE INDEX "ActivityEvent_projectId_idx" ON "ActivityEvent"("projectId");

CREATE INDEX "Document_uploaderId_idx" ON "Document"("uploaderId");
CREATE INDEX "Document_status_idx" ON "Document"("status");

CREATE INDEX "Chunk_documentId_idx" ON "Chunk"("documentId");

CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");
CREATE INDEX "ChatMessage_documentId_idx" ON "ChatMessage"("documentId");

CREATE INDEX "QuizQuestion_documentId_idx" ON "QuizQuestion"("documentId");

CREATE INDEX "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");
