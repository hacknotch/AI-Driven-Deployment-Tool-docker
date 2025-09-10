-- Enable Row Level Security on the user table
ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own data
CREATE POLICY "Users can view their own data" 
ON public.user 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert their own data" 
ON public.user 
FOR INSERT 
WITH CHECK (auth.uid()::text = id::text);

-- Create policy for users to update their own data
CREATE POLICY "Users can update their own data" 
ON public.user 
FOR UPDATE 
USING (auth.uid()::text = id::text);

-- Update the user table to use UUID for id and reference auth.users
ALTER TABLE public.user 
ALTER COLUMN id SET DATA TYPE UUID USING gen_random_uuid(),
ADD CONSTRAINT user_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
