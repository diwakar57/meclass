-- Student Monitoring Schema
-- Tracks student behavior during online classes

-- Create enum for focus status
CREATE TYPE focus_status AS ENUM ('focused', 'unfocused');
CREATE TYPE monitoring_event_type AS ENUM ('CLASS_PAUSED', 'CLASS_RESUMED', 'ALERT_TRIGGERED', 'FACE_DETECTED', 'MULTIPLE_PERSONS');

-- Monitoring Logs Table
CREATE TABLE student_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  focus_status focus_status NOT NULL DEFAULT 'focused',
  mouse_movement INTEGER NOT NULL DEFAULT 0,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  face_detected BOOLEAN NOT NULL DEFAULT false,
  alert_triggered BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classrooms(id),
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id)
);

-- Class Monitoring Events Table
CREATE TABLE class_monitoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type monitoring_event_type NOT NULL,
  reason TEXT,
  triggered_by UUID NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classrooms(id),
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_triggered_by FOREIGN KEY (triggered_by) REFERENCES users(id)
);

-- Update Schools Table to add monitoring fields
ALTER TABLE schools ADD COLUMN IF NOT EXISTS monitoring_feature_enabled BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS monitoring_settings JSONB DEFAULT '{
  "enableFaceDetection": false,
  "enableTabSwitchDetection": true,
  "enableMouseTracking": false,
  "focusPauseDelay": 5000,
  "alertSoundEnabled": true,
  "pauseClassOnAlert": false,
  "notifyOnAlert": true,
  "logRetentionDays": 90
}'::jsonb;

-- Update Classrooms Table to add pause fields
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS pause_reason TEXT;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX idx_student_monitoring_logs_class_id ON student_monitoring_logs(class_id);
CREATE INDEX idx_student_monitoring_logs_student_id ON student_monitoring_logs(student_id);
CREATE INDEX idx_student_monitoring_logs_school_id ON student_monitoring_logs(school_id);
CREATE INDEX idx_student_monitoring_logs_timestamp ON student_monitoring_logs(timestamp);
CREATE INDEX idx_student_monitoring_logs_alert ON student_monitoring_logs(alert_triggered);

CREATE INDEX idx_class_monitoring_events_class_id ON class_monitoring_events(class_id);
CREATE INDEX idx_class_monitoring_events_student_id ON class_monitoring_events(student_id);
CREATE INDEX idx_class_monitoring_events_type ON class_monitoring_events(event_type);
CREATE INDEX idx_class_monitoring_events_timestamp ON class_monitoring_events(timestamp);

-- Create composite indexes for common queries
CREATE INDEX idx_student_monitoring_class_student_time 
ON student_monitoring_logs(class_id, student_id, timestamp DESC);

CREATE INDEX idx_monitoring_focus_status 
ON student_monitoring_logs(school_id, focus_status, timestamp DESC);
