CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    target_id VARCHAR(255),
    must_change_password BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(255) PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50) DEFAULT 'indigo'
);

CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(255) PRIMARY KEY,
    department_id VARCHAR(255) REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(50),
    semester INT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(255) PRIMARY KEY,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    department_id VARCHAR(255) REFERENCES departments(id) ON DELETE SET NULL,
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) PRIMARY KEY,
    enrollment_number VARCHAR(100) UNIQUE NOT NULL,
    roll_number VARCHAR(100),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE SET NULL,
    semester INT NOT NULL,
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(255) PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    semester INT NOT NULL,
    department_id VARCHAR(255) REFERENCES departments(id) ON DELETE SET NULL,
    assigned_teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(255) PRIMARY KEY,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    subject_id VARCHAR(255) REFERENCES subjects(id) ON DELETE CASCADE,
    batch_id VARCHAR(255) REFERENCES batches(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    UNIQUE (student_id, subject_id, date)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    record_id VARCHAR(255) REFERENCES attendance_records(id) ON DELETE CASCADE,
    modified_by VARCHAR(255) NOT NULL,
    modified_date TIMESTAMP NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'BATCH' | 'DEPARTMENT'
    target_id VARCHAR(255) NOT NULL, -- batch_id or department_id
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS substitute_assignments (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
    substitute_id VARCHAR(255) REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id VARCHAR(255) REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(teacher_id, subject_id, is_active)
);

CREATE TABLE IF NOT EXISTS timetable (
    id VARCHAR(255) PRIMARY KEY,
    batch_id VARCHAR(255) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id VARCHAR(255) NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id VARCHAR(255) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week VARCHAR(50) NOT NULL,
    start_time VARCHAR(50) NOT NULL,
    end_time VARCHAR(50) NOT NULL,
    classroom VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, day_of_week, start_time)
);

-- Enable Row Level Security (RLS) on all public tables to secure PostgREST/Supabase exposure
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;