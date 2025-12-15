-- Allow all authenticated users to create chat groups to avoid recursion issues

DROP POLICY IF EXISTS "Admins and DMs can create groups" ON public.chat_groups;
CREATE POLICY "Authenticated users can create groups"
  ON public.chat_groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);