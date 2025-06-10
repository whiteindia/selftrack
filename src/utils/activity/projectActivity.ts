
import { logActivity } from './core';

export const logProjectActivity = async (projectName: string, projectId: string, action: string, comment?: string, clientName?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `${action} project: ${projectName}${clientName ? ` for ${clientName}` : ''}`,
    comment
  });
};

export const logProjectCreated = async (projectName: string, projectId: string, clientName: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `Created new project: ${projectName} for client ${clientName}`,
    comment: `Client: ${clientName}`
  });
};

export const logProjectUpdated = async (projectName: string, projectId: string, updateType: string, clientName?: string) => {
  await logActivity({
    action_type: 'updated',
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `Updated project: ${projectName} - ${updateType}`,
    comment: clientName ? `Client: ${clientName}` : undefined
  });
};

export const logProjectDeleted = async (projectName: string, projectId: string, clientName: string) => {
  await logActivity({
    action_type: 'deleted',
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `Deleted project: ${projectName} for client ${clientName}`,
    comment: `Client: ${clientName}`
  });
};
