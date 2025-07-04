-- Add time slot fields to sprints table for workload calendar integration
ALTER TABLE sprints 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN slot_date DATE,
ADD COLUMN estimated_hours DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN sprints.start_time IS 'Start time of the sprint slot (e.g., 09:00)';
COMMENT ON COLUMN sprints.end_time IS 'End time of the sprint slot (e.g., 17:00)';
COMMENT ON COLUMN sprints.slot_date IS 'Date of the sprint slot (for workload calendar)';
COMMENT ON COLUMN sprints.estimated_hours IS 'Estimated hours for this sprint slot';

-- Create index for efficient workload calendar queries
CREATE INDEX idx_sprints_slot_date ON sprints(slot_date);
CREATE INDEX idx_sprints_time_slot ON sprints(slot_date, start_time, end_time); 