
-- Add foreign key constraint from invoice_comments.user_id to profiles.id
ALTER TABLE public.invoice_comments 
ADD CONSTRAINT fk_invoice_comments_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
