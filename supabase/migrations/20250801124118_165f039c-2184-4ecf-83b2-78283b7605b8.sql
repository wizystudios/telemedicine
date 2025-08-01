-- Create patient problems notifications system
-- Add file upload support to chat messages table 
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create table for tracking patient urgent problems
CREATE TABLE IF NOT EXISTS patient_problem_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  has_urgent_problem BOOLEAN DEFAULT FALSE,
  problem_id UUID REFERENCES patient_problems(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id)
);

-- Enable RLS
ALTER TABLE patient_problem_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for patient_problem_indicators
CREATE POLICY "Anyone can view patient problem indicators" 
ON patient_problem_indicators FOR SELECT 
USING (true);

CREATE POLICY "Patients can manage their own indicators" 
ON patient_problem_indicators FOR ALL 
USING (patient_id = auth.uid());

-- Trigger to update patient problem indicators when a problem is created
CREATE OR REPLACE FUNCTION update_patient_problem_indicator()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO patient_problem_indicators (patient_id, has_urgent_problem, problem_id)
    VALUES (NEW.patient_id, TRUE, NEW.id)
    ON CONFLICT (patient_id) 
    DO UPDATE SET 
      has_urgent_problem = TRUE,
      problem_id = NEW.id,
      updated_at = NOW();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'resolved' THEN
    UPDATE patient_problem_indicators 
    SET has_urgent_problem = FALSE, updated_at = NOW()
    WHERE patient_id = NEW.patient_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS patient_problem_indicator_trigger ON patient_problems;
CREATE TRIGGER patient_problem_indicator_trigger
  AFTER INSERT OR UPDATE ON patient_problems
  FOR EACH ROW EXECUTE FUNCTION update_patient_problem_indicator();