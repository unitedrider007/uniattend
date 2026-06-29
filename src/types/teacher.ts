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
