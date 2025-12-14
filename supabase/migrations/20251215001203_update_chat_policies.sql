-- Update chat policies to allow users to create groups and add themselves as members

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and DMs can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Admins and DMs can manage members" ON public.chat_group_members;

-- New policy for chat_groups insert: allow if user is the creator
CREATE POLICY "Users can create groups"
  ON public.chat_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Update select policy to allow creators to view their groups
DROP POLICY IF EXISTS "Members can view their groups" ON public.chat_groups;
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

-- New policy for chat_group_members: allow if user is admin/DM or adding themselves
CREATE POLICY "Users can manage chat members"
  ON public.chat_group_members FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'digital_marketer'::app_role) OR
    auth.uid() = user_id
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'digital_marketer'::app_role) OR
    auth.uid() = user_id
  );