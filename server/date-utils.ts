/**
 * Utility functions for consistent timezone handling
 * When working with dates, we want to ensure that:
 * 1. All dates stored in the database are in UTC with timezone info
 * 2. All dates displayed to users are converted to America/New_York (EST/EDT)
 * 3. All date comparisons are done consistently
 */

/**
 * Convert a date to EST (America/New_York timezone)
 * @param date Date to convert
 * @returns Date string in EST timezone
 */
export function convertToEST(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d);
}

/**
 * Get the current date in EST timezone
 * @returns Current date in EST timezone
 */
export function getCurrentDateEST(): Date {
  // Create a date string in EST
  const estDateString = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', 
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
  
  // Parse the date string back to a Date object
  const [month, day, year, time] = estDateString.split(/[\/,\s]+/);
  const [hours, minutes, seconds] = time.split(':');
  
  return new Date(+year, +month - 1, +day, +hours, +minutes, +seconds);
}

/**
 * Get the beginning of the day in EST timezone
 * @param date Date to get the beginning of the day for (defaults to current date)
 * @returns Date object representing the beginning of the day in EST
 */
export function getStartOfDayEST(date?: Date): Date {
  const estDate = date ? convertToEST(date) : convertToEST(new Date());
  const [month, day, year] = estDate.split(/[\/,\s]+/);
  return new Date(+year, +month - 1, +day, 0, 0, 0);
}

/**
 * Format a date for display in EST timezone
 * @param date Date to format
 * @param format Format to use (full, date-only, time-only)
 * @returns Formatted date string
 */
export function formatDateEST(date: Date | string, format: 'full' | 'date-only' | 'time-only' = 'full'): string {
  const d = date instanceof Date ? date : new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
  };
  
  if (format === 'full' || format === 'date-only') {
    options.year = 'numeric';
    options.month = 'short';
    options.day = 'numeric';
  }
  
  if (format === 'full' || format === 'time-only') {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = true;
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(d);
}