-- Simplify policies for chat_groups to prevent recursion

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and DMs can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Admins and DMs can update groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Admins and DMs can delete groups" ON public.chat_groups;

-- Create simplified policies
CREATE POLICY "Admins and DMs can create groups"
  ON public.chat_groups FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );

CREATE POLICY "Members can view their groups"
  ON public.chat_groups FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.chat_group_members WHERE group_id = chat_groups.id
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );

CREATE POLICY "Admins and DMs can update groups"
  ON public.chat_groups FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );

CREATE POLICY "Admins and DMs can delete groups"
  ON public.chat_groups FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );