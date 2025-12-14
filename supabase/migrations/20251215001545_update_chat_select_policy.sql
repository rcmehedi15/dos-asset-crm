-- Update chat policies to allow creators to view their groups

-- Update select policy to allow creators to view their groups
DROP POLICY IF EXISTS "Members and creators can view groups" ON public.chat_groups;
CREATE POLICY "Members and creators can view groups"
  ON public.chat_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members
      WHERE group_id = chat_groups.id AND user_id = auth.uid()
    )
    OR chat_groups.created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );