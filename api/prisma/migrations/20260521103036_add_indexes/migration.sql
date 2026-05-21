-- CreateIndex
CREATE INDEX "attendance_record_sessionId_idx" ON "attendance_record"("sessionId");

-- CreateIndex
CREATE INDEX "attendance_session_courseId_idx" ON "attendance_session"("courseId");

-- CreateIndex
CREATE INDEX "course_teacherId_idx" ON "course"("teacherId");

-- CreateIndex
CREATE INDEX "enrollment_courseId_idx" ON "enrollment"("courseId");
