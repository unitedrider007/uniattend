import { uamsFetch } from "../utils/api";

export const adminService = {
  async getDepartments() {
    const res = await uamsFetch("/api/departments");
    if (!res.ok) throw new Error("Failed to load official departments directory.");
    return res.json();
  },

  async getBatches() {
    const res = await uamsFetch("/api/batches");
    if (!res.ok) throw new Error("Failed to load class batches list.");
    return res.json();
  },

  async getSubjects() {
    const res = await uamsFetch("/api/subjects");
    if (!res.ok) throw new Error("Failed to load subjects directory.");
    return res.json();
  },

  async getTeachers() {
    const res = await uamsFetch("/api/teachers");
    if (!res.ok) throw new Error("Failed to load faculty listings.");
    return res.json();
  },

  async getStudents() {
    const res = await uamsFetch("/api/students");
    if (!res.ok) throw new Error("Failed to load student listings.");
    return res.json();
  },

  async getAdminSummary() {
    const res = await uamsFetch("/api/analytics/admin-summary");
    if (!res.ok) throw new Error("Failed to compile administrator overview summary.");
    return res.json();
  },

  async getStudentsSummary() {
    const res = await uamsFetch("/api/analytics/students-summary");
    if (!res.ok) throw new Error("Failed to compile student metrics.");
    return res.json();
  },

  async getTimetable() {
    const res = await uamsFetch("/api/timetable");
    if (!res.ok) throw new Error("Failed to retrieve timetable database.");
    return res.json();
  },

  async saveDepartment(id: string | undefined, payload: { name: string; code: string; description: string }) {
    const url = id ? `/api/departments/${id}` : "/api/departments";
    const method = id ? "PUT" : "POST";
    const res = await uamsFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to save department.");
    }
    return res.json();
  },

  async deleteDepartment(id: string) {
    const res = await uamsFetch(`/api/departments/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete department.");
    return res;
  },

  async saveBatch(payload: { name: string; semester: number; academicYear: string; departmentId: string }) {
    const res = await uamsFetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to create batch.");
    }
    return res.json();
  },

  async deleteBatch(id: string) {
    const res = await uamsFetch(`/api/batches/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete batch.");
    return res;
  },

  async saveSubject(id: string | undefined, payload: { code: string; name: string; semester: number; departmentId: string; assignedTeacherId: string }) {
    const url = id ? `/api/subjects/${id}` : "/api/subjects";
    const method = id ? "PUT" : "POST";
    const res = await uamsFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to save subject.");
    }
    return res.json();
  },

  async deleteSubject(id: string) {
    const res = await uamsFetch(`/api/subjects/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete subject.");
    return res;
  },

  async saveTeacher(id: string | undefined, payload: any) {
    const url = id ? `/api/teachers/${id}` : "/api/teachers";
    const method = id ? "PUT" : "POST";
    const res = await uamsFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let errMsg = "An error occurred";
      try {
        const errData = await res.json();
        errMsg = errData.message || errMsg;
      } catch {
        errMsg = await res.text() || errMsg;
      }
      throw new Error(res.status === 413 ? "Image file is too large. Please select a smaller photo." : errMsg);
    }
    return res.json();
  },

  async deleteTeacher(id: string) {
    const res = await uamsFetch(`/api/teachers/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete teacher.");
    return res.json();
  },

  async saveTimetableSlot(payload: { id?: string; batchId: string; subjectId: string; teacherId: string; dayOfWeek: string; startTime: string; endTime: string; classroom?: string }) {
    const res = await uamsFetch("/api/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to save timetable slot.");
    }
    return res.json();
  },

  async deleteTimetableSlot(id: string) {
    const res = await uamsFetch(`/api/timetable/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to delete timetable slot.");
    }
    return res.json();
  },

  async saveStudent(id: string | undefined, payload: any) {
    const url = id ? `/api/students/${id}` : "/api/students";
    const method = id ? "PUT" : "POST";
    const res = await uamsFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let errMsg = "An error occurred";
      try {
        const errData = await res.json();
        errMsg = errData.message || errMsg;
      } catch {
        errMsg = await res.text() || errMsg;
      }
      throw new Error(res.status === 413 ? "Image file is too large. Please select a smaller photo." : errMsg);
    }
    return res.json();
  },

  async deleteStudent(id: string) {
    const res = await uamsFetch(`/api/students/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete student.");
    return res.json();
  },

  async bulkUploadStudents(csvText: string) {
    const res = await uamsFetch("/api/students/bulk-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to bulk import students.");
    }
    return res.json();
  }
};
