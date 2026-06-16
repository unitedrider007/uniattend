import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address format." }),
  password: z.string().min(1, { message: "Password is required." })
});

export const studentSchema = z.object({
  enrollmentNumber: z.string().min(3),
  rollNumber: z.string().min(1),
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  batchId: z.string().min(1),
  semester: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]),
  password: z.string().min(4, { message: "Password must be at least 4 characters long." }),
  profilePhotoUrl: z.string().optional()
});

export const teacherSchema = z.object({
  employeeId: z.string().min(3),
  fullName: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  departmentId: z.string().min(1),
  password: z.string().min(4, { message: "Password must be at least 4 characters long." }),
  profilePhotoUrl: z.string().optional()
});

export const departmentSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2).max(10),
  description: z.string().optional()
});

export const batchSchema = z.object({
  name: z.string().min(1),
  semester: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]),
  academicYear: z.string().min(4),
  departmentId: z.string().min(1)
});

export const subjectSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(3),
  semester: z.union([z.number(), z.string().transform((v) => parseInt(v, 10))]),
  departmentId: z.string().min(1),
  assignedTeacherId: z.string().nullable().optional()
});

export const markAttendanceSchema = z.object({
  subjectId: z.string().min(1),
  batchId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(["PRESENT", "ABSENT"])
    })
  )
});

export const editAttendanceSchema = z.object({
  recordId: z.string().min(1),
  newStatus: z.enum(["PRESENT", "ABSENT"]),
  remarks: z.string().optional(),
  modifiedBy: z.string().min(1)
});

export const announcementSchema = z.object({
  teacherId: z.string().min(1),
  type: z.enum(["BATCH", "DEPARTMENT"]),
  targetId: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1)
});

export const assignSubstituteSchema = z.object({
  teacherId: z.string().min(1),
  substituteId: z.string().min(1),
  subjectId: z.string().min(1)
});

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input parameters provided.",
        errors: result.error.issues.map(err => ({
          path: err.path.join("."),
          message: err.message
        }))
      });
    }
    req.body = result.data;
    next();
  };
};
