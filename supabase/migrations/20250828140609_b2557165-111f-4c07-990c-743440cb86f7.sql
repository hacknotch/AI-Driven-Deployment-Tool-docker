-- Enable Row Level Security on the user table
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

-- Add user_id column to reference auth.users if it doesn't exist
ALTER TABLE public.user 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create policy for users to view their own data
CREATE POLICY "Users can view their own data" 
ON public.user 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert their own data" 
ON public.user 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update their own data" 
ON public.user 
FOR UPDATE 
USING (auth.uid() = user_id);
