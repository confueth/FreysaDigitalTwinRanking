import { getStartOfDayEST, formatDateEST, convertToEST } from './server/date-utils';

// Test UTC to EST conversion
const utcDate = new Date('2025-03-05T12:00:00Z');
console.log('UTC Date:', utcDate.toISOString());
console.log('EST Converted:', convertToEST(utcDate));
console.log('EST Formatted:', formatDateEST(utcDate));
console.log('EST Start of day:', getStartOfDayEST(utcDate));

// Test current time
console.log('\nCurrent time in UTC:', new Date().toISOString());
console.log('Current time in EST:', convertToEST(new Date()));
