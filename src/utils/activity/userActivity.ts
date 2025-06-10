
import { logActivity } from './core';

export const logUserLogin = async (userEmail: string) => {
  await logActivity({
    action_type: 'logged_in',
    entity_type: 'user',
    entity_name: userEmail,
    description: `User ${userEmail} logged in`
  });
};
