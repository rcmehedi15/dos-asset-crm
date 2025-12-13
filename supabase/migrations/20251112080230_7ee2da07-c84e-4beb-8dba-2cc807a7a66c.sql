-- Add DELETE policy for leads (admins only)
CREATE POLICY "Admins can delete leads" 
ON public.leads 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add stage tracking fields for reporting
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'MQL',
ADD COLUMN IF NOT EXISTS sub_source text,
ADD COLUMN IF NOT EXISTS project_name text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Create index for better report performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);