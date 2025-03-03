import React from 'react';
import { XAxis } from 'recharts';

/**
 * A custom XAxis component with safe formatting
 * This is used to fix the NaN/NaN error when displaying a single agent
 * while still showing formatted dates
 */
export function CustomXAxisNoFormatter(props: any) {
  return (
    <XAxis 
      dataKey="timestamp" 
      tick={{ fill: '#9ca3af' }}
      tickFormatter={(value) => {
        // Safely display the value - if it's already formatted, return as is
        if (typeof value === 'string' && (value.includes('/') || value.includes('Today'))) {
          return value;
        }
        
        try {
          // Otherwise try to parse and format the date
          const date = new Date(value);
          // Check if date is valid before formatting
          if (!isNaN(date.getTime())) {
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        } catch (e) {
          // If parsing fails, return the original value
          console.warn('Date parsing error', e);
        }
        
        return value;
      }}
      {...props}
    />
  );
}