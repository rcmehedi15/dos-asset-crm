-- Update the leads table to add new status and priority fields
-- Add priority status column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_status text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_priority_status ON public.leads(priority_status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);

-- Update the stage values to include MGL and SGL
COMMENT ON COLUMN public.leads.stage IS 'Lead stage: MQL (Marketing Qualified Lead), SQL (Sales Qualified Lead), MGL (Marketing Generated Lead), SGL (Sales Generated Lead)';

-- Add constraint to ensure only one role per user
-- First, drop any existing constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS unique_user_role;

-- Add unique constraint on user_id to ensure one role per user
ALTER TABLE public.user_roles ADD CONSTRAINT unique_user_role UNIQUE (user_id);

-- Create function to prevent multiple roles
CREATE OR REPLACE FUNCTION public.check_single_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user already has a role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.user_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'User can only have one role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single role
DROP TRIGGER IF EXISTS enforce_single_role ON public.user_roles;
CREATE TRIGGER enforce_single_role
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_role();