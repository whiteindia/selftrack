
// Re-export all activity logging functions from their respective modules
export { logActivity } from './activity/core';
export type { ActivityLogData } from './activity/types';

// Task activities
export {
  logTaskUpdate,
  logTaskCreated,
  logTaskStatusChanged,
  logTimeEntry,
  logTimerStarted,
  logTimerStopped
} from './activity/taskActivity';

// User activities
export { logUserLogin } from './activity/userActivity';

// Project activities
export {
  logProjectActivity,
  logProjectCreated,
  logProjectUpdated,
  logProjectDeleted
} from './activity/projectActivity';

// Client activities
export {
  logClientActivity,
  logClientCreated,
  logClientUpdated
} from './activity/clientActivity';

// Financial activities
export {
  logPaymentCreated,
  logInvoiceCreated,
  logInvoiceStatusChanged
} from './activity/financialActivity';
