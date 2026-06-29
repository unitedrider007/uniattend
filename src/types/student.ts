export interface Student {
  id: string;
  enrollmentNumber: string;
  rollNumber: string;
  fullName: string;
  email: string;
  phone: string;
  batchId: string;
  semester: number;
  profilePhotoUrl: string;
  isActive: boolean;
}

export interface StudentSubjectStat {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  category: "SAFE" | "WARNING" | "CRITICAL";
}

export interface StudentLogItem {
  id: string;
  date: string;
  subjectName: string;
  subjectCode: string;
  status: "PRESENT" | "ABSENT";
}

export interface StudentMonthlyStat {
  name: string;
  ratio: number;
}

export interface StudentAnalyticsResponse {
  overallPercentage: number;
  totalClasses: number;
  presentClasses: number;
  absentClasses: number;
  subjectStats: StudentSubjectStat[];
  recentLogs: StudentLogItem[];
  monthlyStats: StudentMonthlyStat[];
  statusCategory: "SAFE" | "WARNING" | "CRITICAL";
  sequenceNumber?: number;
}
