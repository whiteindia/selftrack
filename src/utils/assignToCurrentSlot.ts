import { supabase } from '@/integrations/supabase/client';

/**
 * Assigns a task or subtask to the current hour slot on today's date.
 * This ensures the item appears in CurrentShiftSection, DashboardWorkloadCal, and WorkloadCal.
 */
export const assignToCurrentSlot = async (
  itemId: string,
  itemType: 'task' | 'subtask'
): Promise<void> => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const startHour = currentHour.toString().padStart(2, '0') + ':00';
  const endHour = ((currentHour + 1) % 24).toString().padStart(2, '0') + ':00';

  // Create full datetime strings for slot_start_datetime and slot_end_datetime
  const slotStartDatetime = `${dateStr}T${startHour}:00`;
  const slotEndDatetime = `${dateStr}T${endHour}:00`;
  
  // Create scheduled_time as a full ISO datetime string
  const scheduledTimeIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, 0, 0).toISOString();

  if (itemType === 'task') {
    const { error } = await supabase
      .from('tasks')
      .update({
        date: dateStr,
        scheduled_time: scheduledTimeIso,
        slot_start_datetime: slotStartDatetime,
        slot_end_datetime: slotEndDatetime
      })
      .eq('id', itemId);

    if (error) {
      console.error('Failed to assign task to current slot:', error);
    }
  } else if (itemType === 'subtask') {
    // For subtasks, update the subtask's date and scheduled_time with full ISO datetime
    const { error } = await supabase
      .from('subtasks')
      .update({
        date: dateStr,
        scheduled_time: scheduledTimeIso
      })
      .eq('id', itemId);

    if (error) {
      console.error('Failed to assign subtask to current slot:', error);
    }
  }
};
