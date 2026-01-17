-- Add DELETE policy for activity_feed table
-- Allow users to delete their own activities
CREATE POLICY "Users can delete their own activities" 
ON public.activity_feed 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow admins to delete any activity
CREATE POLICY "Admins can delete all activities" 
ON public.activity_feed 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);