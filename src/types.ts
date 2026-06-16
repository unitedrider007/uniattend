export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  semester: number;
  academicYear: string;
  departmentId: string;
}

export interface Teacher {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  departmentId: string;
  profilePhotoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

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

export interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  departmentId: string;
  assignedTeacherId: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  batchId: string;
  date: string;
  status: "PRESENT" | "ABSENT";
}

export interface AttendanceAudit {
  id: string;
  recordId: string;
  modifiedBy: string;
  modifiedDate: string;
  previousStatus: "PRESENT" | "ABSENT";
  newStatus: "PRESENT" | "ABSENT";
  remarks: string;
  studentName?: string;
  enrollmentNumber?: string;
  subjectName?: string;
  date?: string;
}

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

export interface AdminSummaryResponse {
  totals: {
    totalStudents: number;
    totalTeachers: number;
    totalSubjects: number;
    totalDepartments: number;
    totalBatches: number;
    todayAttendanceRatio: number;
  };
  deptAverages: DeptAverage[];
  semesterData: SemesterStat[];
  defaulters: DefaulterStats;
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

export interface TeacherSubjectSummary {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  classesHeld: number;
  averageRatio: number;
}

export interface TeacherRecentActivity {
  id: string;
  date: string;
  studentName: string;
  subjectName: string;
  status: "PRESENT" | "ABSENT";
}

export interface TeacherAnalyticsResponse {
  classesConducted: number;
  averageAttendance: number;
  subjectSummaries: TeacherSubjectSummary[];
  recentActivity: TeacherRecentActivity[];
  defaulterCount: number;
}

export interface BatchStudentListItem {
  studentId: string;
  fullName: string;
  enrollmentNumber: string;
  rollNumber: string;
  ratio: number;
  defaulter: boolean;
  statusCategory: "SAFE" | "WARNING" | "CRITICAL";
}

export interface BatchAnalyticsResponse {
  batchName: string;
  overallAverage: number;
  totalStudents: number;
  defaultersCount: number;
  studentsList: BatchStudentListItem[];
  highestStudent: {
    fullName: string;
    ratio: number;
  } | null;
  lowestStudent: {
    fullName: string;
    ratio: number;
  } | null;
}
