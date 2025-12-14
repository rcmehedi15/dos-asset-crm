-- Decouple chat_groups and chat_group_members policies to prevent recursion

-- Drop existing policies for chat_groups
DROP POLICY IF EXISTS "Admins and DMs can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Admins and DMs can update groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Admins and DMs can delete groups" ON public.chat_groups;

-- Create new policies for chat_groups
CREATE POLICY "Admins and DMs can create groups"
  ON public.chat_groups FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'digital_marketer'::app_role)
  );

CREATE POLICY "Users can view groups they belong to"
  ON public.chat_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_group_members
      WHERE group_id = chat_groups.id AND user_id = auth.uid()
    )
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

-- Ensure chat_group_members policies are consistent
DROP POLICY IF EXISTS "Group creators can manage members" ON public.chat_group_members;
CREATE POLICY "Group creators can manage members"
  ON public.chat_group_members FOR ALL
  USING (
    auth.uid() = (
      SELECT created_by FROM public.chat_groups
      WHERE id = chat_group_members.group_id
    )
  );