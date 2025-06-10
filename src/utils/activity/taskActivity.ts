
import { logActivity } from './core';

export const logTaskUpdate = async (taskName: string, taskId: string, action: string, comment?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `${action} task: ${taskName}`,
    comment
  });
};

export const logTaskCreated = async (taskName: string, taskId: string, projectName: string, clientName?: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Created new task: ${taskName} in project ${projectName}${clientName ? ` for ${clientName}` : ''}`,
    comment: `Project: ${projectName}`
  });
};

export const logTaskStatusChanged = async (taskName: string, taskId: string, newStatus: string, oldStatus: string, projectName?: string) => {
  await logActivity({
    action_type: `status_changed_to_${newStatus.toLowerCase().replace(' ', '_')}`,
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Changed task status from ${oldStatus} to ${newStatus}: ${taskName}`,
    comment: projectName ? `Project: ${projectName}` : undefined
  });
};

export const logTimeEntry = async (taskName: string, taskId: string, duration: string, comment?: string, projectName?: string) => {
  await logActivity({
    action_type: 'logged_time',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Logged ${duration} on task: ${taskName}`,
    comment: comment || (projectName ? `Project: ${projectName}` : undefined)
  });
};

export const logTimerStarted = async (taskName: string, taskId: string, projectName?: string) => {
  await logActivity({
    action_type: 'timer_started',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Started timer for task: ${taskName}`,
    comment: projectName ? `Project: ${projectName}` : undefined
  });
};

export const logTimerStopped = async (taskName: string, taskId: string, duration: string, projectName?: string) => {
  await logActivity({
    action_type: 'timer_stopped',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Stopped timer for task: ${taskName} (${duration})`,
    comment: projectName ? `Project: ${projectName}` : undefined
  });
};
