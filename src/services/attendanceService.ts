import { teacherService } from "./teacherService";

export const attendanceService = {
  getAuditLogs() {
    return teacherService.getAuditLogs();
  },

  getAttendanceQuery(subjectId: string, batchId: string, date: string) {
    return teacherService.getAttendanceQuery(subjectId, batchId, date);
  },

  getAttendanceReport(subjectId: string, batchId: string) {
    return teacherService.getAttendanceReport(subjectId, batchId);
  },

  markAttendance(payload: { records: { studentId: string; status: "PRESENT" | "ABSENT" }[]; subjectId: string; batchId: string; date: string }) {
    return teacherService.markAttendance(payload);
  },

  editAttendance(payload: { id: string; status: "PRESENT" | "ABSENT"; remarks: string }) {
    return teacherService.editAttendance(payload);
  }
};
