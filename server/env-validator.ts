
// Environment validation helper
export function validateEnvironment() {
  const requiredVars = ['DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Make sure to set these variables in your deployment configuration');
    // In production, we'll just log the error but continue
    if (process.env.NODE_ENV === 'production') {
      return false;
    } else {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }
  }
  
  return true;
}
