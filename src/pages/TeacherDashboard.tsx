import React from "react";
import TeacherPortal from "../components/TeacherPortal";
import { useAuth } from "../hooks/useAuth";

export default function TeacherDashboard() {
  const { currentUser, isMobileView } = useAuth();

  if (!currentUser || currentUser.role !== "TEACHER" || !currentUser.profile) {
    return (
      <div className="p-8 text-center text-slate-500 font-semibold">
        Unauthorized or incomplete faculty session.
      </div>
    );
  }

  return (
    <TeacherPortal 
      teacherUser={currentUser.profile}
      isMobileView={isMobileView}
    />
  );
}
