
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Database } from '@/integrations/supabase/types';

type InvoiceStatus = Database['public']['Enums']['invoice_status'];

interface Invoice {
  id: string;
  amount: number;
  hours: number;
  rate: number;
  status: InvoiceStatus;
  date: string;
  due_date: string;
  clients: {
    name: string;
  };
  projects: {
    name: string;
    service: string;
  };
}

interface Props {
  open: boolean;
  invoice: Invoice | null;
  onOpenChange: (open: boolean) => void;
  setEditInvoice: (inv: Invoice | null) => void;
  onDueDateChange: (date: string) => void;
  onUpdateInvoice: () => void;
  isPending: boolean;
}

const InvoiceEditDialog: React.FC<Props> = ({
  open, invoice, onOpenChange, setEditInvoice, onDueDateChange, onUpdateInvoice, isPending
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Invoice</DialogTitle>
        <DialogDescription>
          Update invoice due date. Amount, hours, and rate are linked to invoice tasks and cannot be edited directly.
        </DialogDescription>
      </DialogHeader>
      {invoice && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-amount">Amount (₹) - Read Only</Label>
            <Input
              id="view-amount"
              type="number"
              step="0.01"
              value={invoice.amount}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="view-hours">Hours - Read Only</Label>
            <Input
              id="view-hours"
              type="number"
              step="0.01"
              value={invoice.hours}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="view-rate">Rate (₹/hr) - Read Only</Label>
            <Input
              id="view-rate"
              type="number"
              step="0.01"
              value={invoice.rate}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-due-date">Due Date</Label>
            <Input
              id="edit-due-date"
              type="date"
              value={invoice.due_date}
              onChange={(e) => onDueDateChange(e.target.value)}
            />
          </div>
          <Button 
            onClick={onUpdateInvoice} 
            className="w-full"
            disabled={isPending}
          >
            {isPending ? 'Updating...' : 'Update Due Date'}
          </Button>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default InvoiceEditDialog;
