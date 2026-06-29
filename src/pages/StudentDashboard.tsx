import React from "react";
import StudentPortal from "../components/StudentPortal";
import { useAuth } from "../hooks/useAuth";

export default function StudentDashboard() {
  const { currentUser, notificationsList, isMobileView } = useAuth();

  if (!currentUser || currentUser.role !== "STUDENT" || !currentUser.profile) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Unauthorized or incomplete student session.
      </div>
    );
  }

  return (
    <StudentPortal 
      studentUser={currentUser.profile}
      allNotifications={notificationsList}
      isMobileView={isMobileView}
    />
  );
}
