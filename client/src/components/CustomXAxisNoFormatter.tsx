import React from 'react';
import { XAxis } from 'recharts';

/**
 * A custom XAxis component without a formatter
 * This is used to fix the NaN/NaN error when displaying a single agent
 */
export function CustomXAxisNoFormatter(props: any) {
  return (
    <XAxis 
      dataKey="timestamp" 
      tick={{ fill: '#9ca3af' }}
      {...props}
    />
  );
}