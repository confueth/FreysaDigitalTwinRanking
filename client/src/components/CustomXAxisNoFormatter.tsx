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
      interval={0}
      tick={{ fill: '#9ca3af' }}
      allowDataOverflow={false}
      {...props}
    />
  );
}