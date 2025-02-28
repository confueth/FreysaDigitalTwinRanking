import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Debounce function to improve performance by limiting handler calls
function debounce<T extends (...args: any[]) => any>(func: T, wait = 100) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create a memoized onChange handler with debounce
    const onChange = React.useCallback(
      debounce(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
      }, 150),
      []
    );

    // Use matchMedia for better performance
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", onChange)
    
    // Set initial state
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Cleanup
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
