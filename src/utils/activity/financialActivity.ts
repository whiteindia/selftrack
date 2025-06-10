
import { logActivity } from './core';

export const logPaymentCreated = async (amount: number, clientName: string, invoiceId: string, paymentId: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'payment',
    entity_id: paymentId,
    entity_name: `Payment for ${clientName}`,
    description: `Recorded payment of ₹${amount} for invoice ${invoiceId}`,
    comment: `Client: ${clientName}, Invoice: ${invoiceId}`
  });
};

export const logInvoiceCreated = async (invoiceId: string, clientName: string, projectName: string, amount: number, hours: number) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'invoice',
    entity_id: invoiceId,
    entity_name: invoiceId,
    description: `Created invoice ${invoiceId} for ${clientName} - ₹${amount}`,
    comment: `Project: ${projectName}, ${hours} hours`
  });
};

export const logInvoiceStatusChanged = async (invoiceId: string, newStatus: string, oldStatus: string, clientName?: string) => {
  await logActivity({
    action_type: 'updated',
    entity_type: 'invoice',
    entity_id: invoiceId,
    entity_name: invoiceId,
    description: `Updated invoice ${invoiceId} status from ${oldStatus} to ${newStatus}`,
    comment: clientName ? `Client: ${clientName}` : undefined
  });
};
