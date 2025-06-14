
-- Create a table for invoice comments
CREATE TABLE public.invoice_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id text NOT NULL,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraint to invoices table
ALTER TABLE public.invoice_comments 
ADD CONSTRAINT fk_invoice_comments_invoice_id 
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.invoice_comments ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing invoice comments (authenticated users can see all)
CREATE POLICY "Authenticated users can view invoice comments" 
  ON public.invoice_comments 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy for inserting invoice comments (authenticated users can create)
CREATE POLICY "Authenticated users can create invoice comments" 
  ON public.invoice_comments 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy for updating invoice comments (users can only update their own)
CREATE POLICY "Users can update their own invoice comments" 
  ON public.invoice_comments 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for deleting invoice comments (users can only delete their own)
CREATE POLICY "Users can delete their own invoice comments" 
  ON public.invoice_comments 
  FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_invoice_comments_invoice_id ON public.invoice_comments(invoice_id);
CREATE INDEX idx_invoice_comments_created_at ON public.invoice_comments(created_at DESC);
