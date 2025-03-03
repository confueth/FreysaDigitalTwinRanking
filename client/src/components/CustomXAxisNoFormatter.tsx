import React from 'react';
import { XAxis } from 'recharts';

interface CustomXAxisProps {
  dataKey: string;
  [key: string]: any;  // Allow any other props
}

/**
 * A custom XAxis component with safe formatting
 * This is used to fix the NaN/NaN error when displaying a single agent
 * while still showing formatted dates
 */
export function CustomXAxisNoFormatter({ dataKey = "dateString", ...props }: CustomXAxisProps) {
  return (
    <XAxis 
      dataKey={dataKey}
      interval={0}
      tick={{ fill: '#9ca3af' }}
      allowDataOverflow={false}
      angle={0}
      textAnchor="middle"
      height={60}
      minTickGap={0}
      {...props}
    />
  );
}