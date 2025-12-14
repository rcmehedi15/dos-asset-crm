-- Simplify chat_group_members policies to avoid infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can manage chat members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Admins and DMs can manage members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Members can view group membership" ON public.chat_group_members;

-- Create simple policies without has_role to avoid recursion
CREATE POLICY "Users can view their own chat memberships"
  ON public.chat_group_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat memberships"
  ON public.chat_group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat memberships"
  ON public.chat_group_members FOR DELETE
  USING (auth.uid() = user_id);

-- Allow group creators to manage all members through a separate policy
CREATE POLICY "Group creators can manage members"
  ON public.chat_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_groups
      WHERE chat_groups.id = chat_group_members.group_id
      AND chat_groups.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_groups
      WHERE chat_groups.id = chat_group_members.group_id
      AND chat_groups.created_by = auth.uid()
    )
  );