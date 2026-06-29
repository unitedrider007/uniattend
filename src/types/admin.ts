import { DeptAverage, SemesterStat, DefaulterStats } from "./dashboard";

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

export interface Subject {
  id: string;
  code: string;
  name: string;
  semester: number;
  departmentId: string;
  assignedTeacherId: string;
  batchName?: string;
  teacherName?: string;
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

export interface TimetableSlot {
  id: string;
  batchId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  classroom?: string;
  batchName?: string;
  subjectName?: string;
  subjectCode?: string;
  teacherName?: string;
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
