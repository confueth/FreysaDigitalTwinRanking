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
      tick={{ fill: '#9ca3af', fontSize: 12 }}
      allowDataOverflow={false}
      angle={0}
      textAnchor="middle"
      height={60}
      minTickGap={-10}
      padding={{ left: 10, right: 10 }}
      tickMargin={10}
      tickSize={8}
      hide={false}
      {...props}
    />
  );
}