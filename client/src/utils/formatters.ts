/**
 * Format a number with comma separators
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a number with k/m suffix for thousands/millions
 */
export function formatCompactNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toString();
}

/**
 * Format a date from string to a readable format
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a timestamp to relative time (e.g. "5 minutes ago")
 */
export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }
  
  if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  }
  
  if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  }
  
  return 'Just now';
}

/**
 * Get a CSS class for rank change indicator
 */
export function getRankChangeClass(current?: number | null, previous?: number | null): string {
  if (current === undefined || previous === undefined || current === null || previous === null) return 'text-gray-400';
  
  if (current < previous) {
    return 'text-green-500';
  }
  
  if (current > previous) {
    return 'text-red-500';
  }
  
  return 'text-gray-400';
}

/**
 * Get a CSS class for score change indicator
 */
export function getScoreChangeClass(current?: number | null, previous?: number | null): string {
  if (current === undefined || previous === undefined || current === null || previous === null) return 'text-gray-400';
  
  if (current > previous) {
    return 'text-green-500';
  }
  
  if (current < previous) {
    return 'text-red-500';
  }
  
  return 'text-gray-400';
}

/**
 * Get the change value for display
 */
export function getChangeValue(current?: number | null, previous?: number | null): string {
  if (current === undefined || previous === undefined || current === null || previous === null) return '-';
  
  const diff = current - previous;
  
  if (diff > 0) {
    return `+${formatNumber(diff)}`;
  }
  
  if (diff < 0) {
    return formatNumber(diff);
  }
  
  return '-';
}

/**
 * Format a wallet address to a short version (e.g. 0x742d...f44e)
 */
export function formatWalletAddress(address?: string): string {
  if (!address) return '';
  
  if (address.length <= 12) return address;
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
