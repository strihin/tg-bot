import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(__dirname, '../../logs');

// Ensure logs directory exists
function ensureLogsDir(): void {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

export interface ActivityLog {
  timestamp: string;
  type: 'message' | 'callback' | 'error' | 'info';
  userId: number;
  data: string;
  details?: Record<string, any>;
}

/**
 * Log activity to file
 */
export function logActivity(log: ActivityLog): void {
  ensureLogsDir();
  
  const logFile = path.join(logsDir, 'activity.jsonl');
  const logEntry = JSON.stringify(log) + '\n';
  
  try {
    fs.appendFileSync(logFile, logEntry, 'utf-8');
  } catch (error) {
    console.error('❌ Error writing to log file:', error);
  }
}

/**
 * Get recent activity logs (last N lines)
 */
export function getRecentActivity(limit: number = 50): ActivityLog[] {
  ensureLogsDir();
  
  const logFile = path.join(logsDir, 'activity.jsonl');
  if (!fs.existsSync(logFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    
    // Return last N lines, parsed as JSON
    return lines.slice(-limit).map(line => {
      try {
        return JSON.parse(line) as ActivityLog;
      } catch {
        return null;
      }
    }).filter((log): log is ActivityLog => log !== null);
  } catch (error) {
    console.error('❌ Error reading log file:', error);
    return [];
  }
}
