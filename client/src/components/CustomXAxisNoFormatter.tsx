import { XAxis } from 'recharts';

/**
 * A custom XAxis component with safe formatting
 * This is used to fix the NaN/NaN error when displaying a single agent
 * while still showing formatted dates
 */
export function CustomXAxisNoFormatter(props: any) {
  // Helper function to safely format a date value
  const safeFormatDate = (value: any): string => {
    // If value is already a formatted string, return it
    if (typeof value === 'string') {
      // If it contains a slash or is "Today", it's already formatted
      if (value.includes('/') || value.includes('Today')) {
        return value;
      }
      
      // Otherwise try to parse it as a date
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }
      } catch (e) {
        // If parsing fails, just return the original
        console.warn('Date parsing failed', e);
      }
    }
    
    // For all other cases including non-date strings, return as is
    return String(value);
  };
  
  // Create new props without type issues
  const safeProps = { ...props };
  
  return (
    <XAxis 
      dataKey="dateString"
      tick={{ fill: '#9ca3af' }}
      tickFormatter={safeFormatDate}
      allowDataOverflow={false}
      {...safeProps}
    />
  );
}