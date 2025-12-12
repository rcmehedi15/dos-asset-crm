-- Add additional fields to leads table for comprehensive lead management

-- Add lead code (auto-generated identifier)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_code TEXT;

-- Add lead & sales type
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_sales_type TEXT;

-- Add customer occupation/designation
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS customer_occupation TEXT,
ADD COLUMN IF NOT EXISTS customer_designation TEXT,
ADD COLUMN IF NOT EXISTS customer_organization TEXT;

-- Add alternate contact information
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS client_name_2 TEXT,
ADD COLUMN IF NOT EXISTS client_phone_2 TEXT;

-- Add meeting schedule information
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS meeting_type TEXT,
ADD COLUMN IF NOT EXISTS meeting_date DATE,
ADD COLUMN IF NOT EXISTS meeting_time TIME,
ADD COLUMN IF NOT EXISTS meeting_notes TEXT;

-- Add customer address information
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS customer_address_details TEXT,
ADD COLUMN IF NOT EXISTS customer_additional_data TEXT;

-- Create function to auto-generate lead code
CREATE OR REPLACE FUNCTION public.generate_lead_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix TEXT;
  sequence_number INTEGER;
  new_code TEXT;
BEGIN
  -- Get current year suffix (e.g., 25 for 2025)
  year_prefix := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Get the count of leads created this year
  SELECT COUNT(*) + 1 INTO sequence_number
  FROM public.leads
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Generate code in format: LEAD-25-0001
  new_code := 'LEAD-' || year_prefix || '-' || LPAD(sequence_number::TEXT, 4, '0');
  
  NEW.lead_code := new_code;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate lead code on insert
DROP TRIGGER IF EXISTS trigger_generate_lead_code ON public.leads;
CREATE TRIGGER trigger_generate_lead_code
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  WHEN (NEW.lead_code IS NULL)
  EXECUTE FUNCTION public.generate_lead_code();

-- Create index for better performance on lead_code lookups
CREATE INDEX IF NOT EXISTS idx_leads_lead_code ON public.leads(lead_code);

-- Create index for meeting dates for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_meeting_date ON public.leads(meeting_date);

COMMENT ON COLUMN public.leads.lead_code IS 'Auto-generated unique identifier for the lead (e.g., LEAD-25-0001)';
COMMENT ON COLUMN public.leads.lead_sales_type IS 'Type of lead or sales category';
COMMENT ON COLUMN public.leads.meeting_type IS 'Type of meeting scheduled with the lead';
COMMENT ON COLUMN public.leads.meeting_date IS 'Date of scheduled meeting';
COMMENT ON COLUMN public.leads.meeting_time IS 'Time of scheduled meeting';