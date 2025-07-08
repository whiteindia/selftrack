
import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

// Convert UTC datetime to IST for display
export const formatToIST = (utcDateTime: string | Date, formatStr: string = 'dd/MM/yyyy HH:mm') => {
  if (!utcDateTime) return '';
  
  try {
    const date = typeof utcDateTime === 'string' ? parseISO(utcDateTime) : utcDateTime;
    const result = formatInTimeZone(date, IST_TIMEZONE, formatStr);
    
    // Debug logging for task reminders and slots
    if (typeof utcDateTime === 'string' && (utcDateTime.includes('T') || formatStr.includes('h:mm'))) {
      console.log(`formatToIST Debug:
        Input: ${utcDateTime}
        Parsed date: ${date.toISOString()}
        Format: ${formatStr}
        IST Result: ${result}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error formatting to IST:', error);
    return '';
  }
};

// Convert IST datetime input to UTC for storage
export const convertISTToUTC = (istDateTime: string) => {
  if (!istDateTime) return null;
  
  try {
    console.log('convertISTToUTC - Input IST:', istDateTime);
    // Parse the datetime-local input components
    const [datePart, timePart] = istDateTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create a Date object as if it's in the local timezone
    // This represents the IST time we want to convert
    const localDate = new Date(year, month - 1, day, hours, minutes, 0);
    console.log('convertISTToUTC - Local date created:', localDate);
    
    // Convert from IST (treated as local time) to UTC
    const utcDate = fromZonedTime(localDate, IST_TIMEZONE);
    console.log('convertISTToUTC - UTC result:', utcDate.toISOString());
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting IST to UTC:', error);
    return null;
  }
};

// Convert UTC datetime to IST for form inputs (datetime-local format)
export const formatUTCToISTInput = (utcDateTime: string | null) => {
  if (!utcDateTime) return '';
  
  try {
    console.log('formatUTCToISTInput - Input UTC:', utcDateTime);
    const date = parseISO(utcDateTime);
    console.log('formatUTCToISTInput - Parsed date:', date);
    const istDate = toZonedTime(date, IST_TIMEZONE);
    console.log('formatUTCToISTInput - IST date:', istDate);
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatted = format(istDate, "yyyy-MM-dd'T'HH:mm");
    console.log('formatUTCToISTInput - Formatted result:', formatted);
    return formatted;
  } catch (error) {
    console.error('Error converting UTC to IST input:', error);
    return '';
  }
};

// Get current IST time for form defaults
export const getCurrentISTTime = () => {
  const now = new Date();
  const istDate = toZonedTime(now, IST_TIMEZONE);
  return format(istDate, "yyyy-MM-dd'T'HH:mm");
};
