
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Download, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import InvoiceComments from '@/components/InvoiceComments';

interface Invoice {
  id: string;
  amount: number;
  hours: number;
  rate: number;
  status: string;
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

interface Task {
  id: string;
  name: string;
  hours: number;
}
interface Props {
  invoice: Invoice;
  invoiceTasks: Task[];
  expanded: boolean;
  onExpand: (id: string | null) => void;
  isOverdue: (invoice: Invoice) => boolean;
  isDueToday: (invoice: Invoice) => boolean;
  getStatusColor: (status: string) => string;
  hasOperationAccess: (entity: string, operation: string) => boolean;
  onPDF: (invoice: Invoice) => void;
  onEdit: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  deletePending: boolean;
  onUpdateStatus: (invoiceId: string, status: string) => void;
  updateStatusPending: boolean;
}

const InvoiceCard: React.FC<Props> = ({
  invoice, invoiceTasks, expanded, onExpand,
  isOverdue, isDueToday, getStatusColor, hasOperationAccess,
  onPDF, onEdit, onDelete, deletePending, onUpdateStatus, updateStatusPending
}) => (
  <Card key={invoice.id} id={`invoice-${invoice.id}`} className="hover:shadow-lg transition-shadow duration-200">
    <CardContent className="p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold break-words">{invoice.id}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(isOverdue(invoice) && invoice.status !== 'Paid' ? 'Overdue' : invoice.status)}>
                {isOverdue(invoice) && invoice.status !== 'Paid' ? 'Overdue' : invoice.status}
              </Badge>
              {isDueToday(invoice) && (
                <Badge variant="outline" className="border-orange-300 text-orange-600">
                  Due Today
                </Badge>
              )}
            </div>
          </div>
          <p className="text-gray-600 mb-1 break-words">{invoice.clients?.name || 'N/A'}</p>
          <p className="text-sm text-gray-500 break-words">{invoice.projects?.name || 'N/A'}</p>
          <p className="text-xs text-gray-400">Service: {invoice.projects?.service || 'N/A'}</p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-600">
            <span className="break-words">{invoice.hours}h × ₹{invoice.rate}/hr</span>
            <span className="break-words">Due: {invoice.due_date}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <p className="text-xl lg:text-2xl font-bold text-gray-900 text-center sm:text-right">
            ₹{invoice.amount.toFixed(2)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExpand(expanded ? null : invoice.id)}
              className="flex-shrink-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              Tasks
            </Button>
            <InvoiceComments invoiceId={invoice.id} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onPDF(invoice)}
              className="flex-shrink-0"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            {hasOperationAccess('invoices', 'update') && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => onEdit(invoice)}
                className="flex-shrink-0"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {hasOperationAccess('invoices', 'delete') && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => onDelete(invoice.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                disabled={deletePending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            {invoice.status === 'Draft' && hasOperationAccess('invoices', 'update') && (
              <Button 
                size="sm"
                onClick={() => onUpdateStatus(invoice.id, 'Sent')}
                disabled={updateStatusPending}
                className="flex-shrink-0"
              >
                Send
              </Button>
            )}
            {invoice.status === 'Sent' && hasOperationAccess('invoices', 'update') && (
              <Button 
                size="sm"
                onClick={() => onUpdateStatus(invoice.id, 'Paid')}
                className="bg-green-600 hover:bg-green-700 flex-shrink-0"
                disabled={updateStatusPending}
              >
                Mark Paid
              </Button>
            )}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-3">Tasks in this invoice:</h4>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-gray-500">
                      No tasks found for this invoice
                    </TableCell>
                  </TableRow>
                ) : (
                  invoiceTasks.map((task, index) => (
                    <TableRow key={index}>
                      <TableCell className="break-words">{task.name || 'N/A'}</TableCell>
                      <TableCell>{task.hours || 0}h</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default InvoiceCard;
