ALTER TABLE "Event" ADD COLUMN "subjectId" TEXT;

CREATE INDEX "Event_subjectId_idx" ON "Event"("subjectId");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
