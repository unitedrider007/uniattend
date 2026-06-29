import { uamsFetch } from "../utils/api";

export const teacherService = {
  async getSubjects() {
    const res = await uamsFetch("/api/subjects");
    if (!res.ok) throw new Error("Failed to load official subjects index.");
    return res.json();
  },

  async getBatches() {
    const res = await uamsFetch("/api/batches");
    if (!res.ok) throw new Error("Failed to load class batches.");
    return res.json();
  },

  async getAnalytics(teacherId: string) {
    const res = await uamsFetch(`/api/analytics/teacher/${teacherId}`);
    if (!res.ok) throw new Error("Failed to compile faculty calculations.");
    return res.json();
  },

  async getAuditLogs() {
    const res = await uamsFetch("/api/attendance/audit-logs");
    if (!res.ok) throw new Error("Failed to fetch audit logs.");
    return res.json();
  },

  async getTeachers() {
    const res = await uamsFetch("/api/teachers");
    if (!res.ok) throw new Error("Failed to fetch teachers catalog.");
    return res.json();
  },

  async getDepartments() {
    const res = await uamsFetch("/api/departments");
    if (!res.ok) throw new Error("Failed to get departments.");
    return res.json();
  },

  async getActiveSubstitutions(teacherId: string) {
    const res = await uamsFetch(`/api/teachers/${teacherId}/active-substitutions`);
    if (!res.ok) throw new Error("Failed to fetch active substitutions.");
    return res.json();
  },

  async getAnnouncements(teacherId: string) {
    const res = await uamsFetch(`/api/announcements/teacher/${teacherId}`);
    if (!res.ok) throw new Error("Failed to fetch announcements.");
    return res.json();
  },

  async getSubstituteSubjects(teacherId: string) {
    const res = await uamsFetch(`/api/teachers/${teacherId}/substitute-subjects`);
    if (!res.ok) throw new Error("Failed to fetch substitute subjects.");
    return res.json();
  },

  async getSessions(teacherId: string) {
    const res = await uamsFetch(`/api/teachers/${teacherId}/sessions`);
    if (!res.ok) throw new Error("Failed to fetch teacher sessions.");
    return res.json();
  },

  async getTimetable(teacherId: string) {
    const res = await uamsFetch(`/api/timetable?teacherId=${teacherId}`);
    if (!res.ok) throw new Error("Failed to fetch teacher timetable.");
    return res.json();
  },

  async createAnnouncement(payload: { teacherId: string; title: string; message: string; batchIds: string[]; departmentId: string }) {
    const res = await uamsFetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to post announcement.");
    }
    return res.json();
  },

  async assignSubstitute(payload: { originalTeacherId: string; substituteTeacherId: string; subjectId: string; date: string }) {
    const res = await uamsFetch("/api/teachers/assign-substitute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to assign substitution.");
    }
    return res.json();
  },

  async getStudents() {
    const res = await uamsFetch("/api/students");
    if (!res.ok) throw new Error("Failed to fetch students directory.");
    return res.json();
  },

  async getAttendanceQuery(subjectId: string, batchId: string, date: string) {
    const res = await uamsFetch(`/api/attendance/query?subjectId=${subjectId}&batchId=${batchId}&date=${date}`);
    if (!res.ok) throw new Error("Failed to query attendance.");
    return res.json();
  },

  async getAttendanceReport(subjectId: string, batchId: string) {
    const res = await uamsFetch(`/api/attendance/query?subjectId=${subjectId}&batchId=${batchId}`);
    if (!res.ok) throw new Error("Failed to query attendance reports.");
    return res.json();
  },

  async markAttendance(payload: { records: { studentId: string; status: "PRESENT" | "ABSENT" }[]; subjectId: string; batchId: string; date: string }) {
    const res = await uamsFetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to mark attendance.");
    }
    return res.json();
  },

  async editAttendance(payload: { id: string; status: "PRESENT" | "ABSENT"; remarks: string }) {
    const res = await uamsFetch("/api/attendance/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to edit attendance record.");
    }
    return res.json();
  }
};
