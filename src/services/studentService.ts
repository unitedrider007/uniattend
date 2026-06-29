import { uamsFetch } from "../utils/api";

export const studentService = {
  async getTimetable(studentId: string) {
    const res = await uamsFetch(`/api/timetable?studentId=${studentId}`);
    if (!res.ok) throw new Error("Failed to fetch student timetable");
    return res.json();
  },

  async getAnalytics(studentId: string) {
    const res = await uamsFetch(`/api/analytics/student/${studentId}`);
    if (!res.ok) throw new Error("Failed to fetch student analytics");
    return res.json();
  },

  async getNotifications(userId: string) {
    const res = await uamsFetch(`/api/notifications/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch student notifications");
    return res.json();
  }
};
