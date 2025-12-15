-- Fix infinite recursion in chat policies by allowing creators to view groups

-- Update the SELECT policy for chat_groups to include creators
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.chat_groups;
CREATE POLICY "Users can view groups they belong to or created"
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

-- Update the chat_group_members policy to allow creators to manage members without recursion
DROP POLICY IF EXISTS "Group creators can manage members" ON public.chat_group_members;
CREATE POLICY "Group creators can manage members"
  ON public.chat_group_members FOR ALL
  USING (
    chat_group_members.group_id IN (
      SELECT id FROM public.chat_groups
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    chat_group_members.group_id IN (
      SELECT id FROM public.chat_groups
      WHERE created_by = auth.uid()
    )
  );