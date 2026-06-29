import { studentService } from "./studentService";
import { teacherService } from "./teacherService";
import { adminService } from "./adminService";

export const analyticsService = {
  getStudentAnalytics(studentId: string) {
    return studentService.getAnalytics(studentId);
  },

  getTeacherAnalytics(teacherId: string) {
    return teacherService.getAnalytics(teacherId);
  },

  getAdminSummary() {
    return adminService.getAdminSummary();
  },

  getStudentsSummary() {
    return adminService.getStudentsSummary();
  }
};
