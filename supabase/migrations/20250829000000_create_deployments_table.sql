-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  repo_link TEXT NOT NULL,
  deployment_stack TEXT[] DEFAULT ARRAY['Docker', 'Kubernetes', 'Cloud Deploy'],
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  webhook_response TEXT,
  error_message TEXT,
  deployment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own deployments" ON deployments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deployments" ON deployments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deployments" ON deployments
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_deployments_updated_at 
  BEFORE UPDATE ON deployments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
