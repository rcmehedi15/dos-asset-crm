-- Update chat policies to allow users to create groups and add themselves as members

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and DMs can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Admins and DMs can manage members" ON public.chat_group_members;

-- New policy for chat_groups insert: allow if user is the creator
CREATE POLICY "Users can create groups"
  ON public.chat_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Keep the select policy as is
-- CREATE POLICY "Members can view their groups" already exists

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