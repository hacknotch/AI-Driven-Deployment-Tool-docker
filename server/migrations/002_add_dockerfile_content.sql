-- Add dockerfile_content column to deployments table
ALTER TABLE deployments 
ADD COLUMN IF NOT EXISTS dockerfile_content TEXT;

-- Add comment for documentation
COMMENT ON COLUMN deployments.dockerfile_content IS 'Generated Dockerfile content from AI service';
