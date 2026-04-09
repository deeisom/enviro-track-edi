-- Fix: restrict activity_log DELETE to admins only
DROP POLICY "Authenticated can delete activity" ON public.activity_log;

CREATE POLICY "Admins can delete activity"
  ON public.activity_log
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
