export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  enrollmentNumber?: string;
  employeeId?: string;
  profilePhotoUrl?: string;
  departmentId?: string;
  batchId?: string;
}

export interface User {
  id: string;
  email: string;
  role: "ADMIN" | "EXECUTIVE" | "TEACHER" | "STUDENT";
  mustChangePassword: boolean;
  profile?: any;
}
