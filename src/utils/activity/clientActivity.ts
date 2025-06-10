
import { logActivity } from './core';

export const logClientActivity = async (clientName: string, clientId: string, action: string, comment?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'client',
    entity_id: clientId,
    entity_name: clientName,
    description: `${action} client: ${clientName}`,
    comment
  });
};

export const logClientCreated = async (clientName: string, clientId: string, company?: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'client',
    entity_id: clientId,
    entity_name: clientName,
    description: `Created new client: ${clientName}${company ? ` (${company})` : ''}`,
    comment: company ? `Company: ${company}` : undefined
  });
};

export const logClientUpdated = async (clientName: string, clientId: string, updateType: string) => {
  await logActivity({
    action_type: 'updated',
    entity_type: 'client',
    entity_id: clientId,
    entity_name: clientName,
    description: `Updated client: ${clientName} - ${updateType}`
  });
};
