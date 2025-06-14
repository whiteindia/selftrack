
-- Add payment_type field to payments table
ALTER TABLE public.payments 
ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'invoice';

-- Add check constraint to ensure valid payment types
ALTER TABLE public.payments 
ADD CONSTRAINT payment_type_check CHECK (payment_type IN ('invoice', 'advance'));

-- Make invoice_id nullable for advance payments
ALTER TABLE public.payments 
ALTER COLUMN invoice_id DROP NOT NULL;

-- Add a sequence for advance payment IDs
CREATE SEQUENCE public.advance_payment_seq START 1;
