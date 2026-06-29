import { useState } from "react";
import { teacherService } from "../services/teacherService";

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryAttendance = async (subjectId: string, batchId: string, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await teacherService.getAttendanceQuery(subjectId, batchId, date);
      return data;
    } catch (e: any) {
      setError(e.message || "Failed to query attendance");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (payload: { records: { studentId: string; status: "PRESENT" | "ABSENT" }[]; subjectId: string; batchId: string; date: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await teacherService.markAttendance(payload);
      return data;
    } catch (e: any) {
      setError(e.message || "Failed to mark attendance");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    queryAttendance,
    markAttendance
  };
}
