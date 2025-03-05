import { getStartOfDayEST, formatDateEST, convertToEST } from './server/date-utils';

// Test cases for timezone conversion
const testDates = [
  // Standard date
  new Date('2025-03-05T12:00:00Z'),
  // Crossing day boundary in EST (7pm UTC = 2pm EST)
  new Date('2025-03-05T19:00:00Z'),
  // Date string format
  '2025-03-05T12:00:00Z',
  // Current time
  new Date()
];

console.log('==========================================');
console.log('TIMEZONE CONVERSION TEST RESULTS:');
console.log('==========================================');

testDates.forEach((date, index) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  console.log(`\nTest case #${index + 1}:`);
  console.log('Input (UTC):', dateObj.toISOString());
  console.log('EST Raw:', convertToEST(date));
  console.log('EST Formatted:', formatDateEST(date));
  console.log('EST Start of day:', getStartOfDayEST(dateObj).toISOString());
  
  // Calculate offset to verify EST conversion (-5 hours from UTC)
  const manualEST = new Date(dateObj.getTime() - (5 * 60 * 60 * 1000));
  console.log('Manual EST offset:', manualEST.toISOString(), 
    '(This is a rough approximation, ignoring DST)');
});

console.log('\n==========================================');
console.log('EST TIMEZONE VERIFICATION:');
console.log('==========================================');
// Create a date that crosses midnight in EST
const beforeMidnight = new Date('2025-03-05T04:59:00Z'); // 11:59pm EST on March 4
const afterMidnight = new Date('2025-03-05T05:01:00Z');  // 12:01am EST on March 5

console.log('\nBefore midnight UTC vs EST:');
console.log('UTC:', beforeMidnight.toISOString());
console.log('EST:', convertToEST(beforeMidnight));
console.log('EST formatted:', formatDateEST(beforeMidnight));
console.log('EST day start:', getStartOfDayEST(beforeMidnight).toISOString());

console.log('\nAfter midnight UTC vs EST:');
console.log('UTC:', afterMidnight.toISOString());
console.log('EST:', convertToEST(afterMidnight));
console.log('EST formatted:', formatDateEST(afterMidnight));
console.log('EST day start:', getStartOfDayEST(afterMidnight).toISOString());

console.log('\nDo these dates represent different days in EST?', 
  getStartOfDayEST(beforeMidnight).getTime() !== getStartOfDayEST(afterMidnight).getTime());
