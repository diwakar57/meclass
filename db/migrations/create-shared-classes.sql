-- Create shared classes table for pace-based optimization
CREATE TABLE IF NOT EXISTS shared_classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pace_multiplier DECIMAL(3, 1) NOT NULL,
  topic_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pace_multiplier, topic_id)
);

CREATE INDEX idx_shared_classes_pace_topic ON shared_classes(pace_multiplier, topic_id);
CREATE INDEX idx_shared_classes_video_id ON shared_classes(video_id);

-- Create discussion groups for shared classes
CREATE TABLE IF NOT EXISTS class_discussion_groups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  shared_class_id TEXT NOT NULL REFERENCES shared_classes(id) ON DELETE CASCADE,
  pace_multiplier DECIMAL(3, 1) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discussion_groups_shared_class ON class_discussion_groups(shared_class_id);
CREATE INDEX idx_discussion_groups_pace ON class_discussion_groups(pace_multiplier);

-- Create student discussion memberships
CREATE TABLE IF NOT EXISTS student_discussions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  discussion_group_id TEXT NOT NULL REFERENCES class_discussion_groups(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  shared_class_id TEXT NOT NULL REFERENCES shared_classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(discussion_group_id, student_id)
);

CREATE INDEX idx_student_discussions_group ON student_discussions(discussion_group_id);
CREATE INDEX idx_student_discussions_student ON student_discussions(student_id);
CREATE INDEX idx_student_discussions_shared_class ON student_discussions(shared_class_id);

-- Add cache metadata columns if needed
ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS uses_shared_content BOOLEAN DEFAULT FALSE;
ALTER TABLE scheduled_classes ADD COLUMN IF NOT EXISTS shared_class_id TEXT REFERENCES shared_classes(id);
