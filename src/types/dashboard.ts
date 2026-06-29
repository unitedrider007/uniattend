export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DeptAverage {
  departmentName: string;
  code: string;
  percentage: number;
}

export interface SemesterStat {
  semester: number;
  percentage: number;
}

export interface DefaulterStats {
  safeCount: number;
  warningCount: number;
  criticalCount: number;
}
