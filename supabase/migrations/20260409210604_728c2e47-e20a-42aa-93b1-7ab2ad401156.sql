-- Allow authenticated users to delete activity log entries
CREATE POLICY "Authenticated can delete activity"
ON public.activity_log
FOR DELETE
TO authenticated
USING (true);
