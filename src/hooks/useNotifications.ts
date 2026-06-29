import { useState, useEffect } from "react";
import { studentService } from "../services/studentService";
import { UserNotification } from "../types";

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await studentService.getNotifications(userId);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  return {
    notifications,
    loading,
    refresh: fetchNotifications
  };
}
