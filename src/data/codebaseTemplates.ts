export interface CodeFile {
  name: string;
  language: string;
  path: string;
  content: string;
}

export const springBootCodeFiles: CodeFile[] = [
  {
    name: "AttendanceController.java",
    language: "java",
    path: "src/main/java/com/uams/controller/AttendanceController.java",
    content: `package com.uams.controller;

import com.uams.dto.AttendanceRequestDto;
import com.uams.dto.AttendanceResponseDto;
import com.uams.dto.AttendanceAuditDto;
import com.uams.service.AttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance Management", description = "Endpoints for marking, updating, and auditing attendance records")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/mark")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Mark daily attendance", description = "Submits a clean list of student statuses for a specific subject, batch, and date.")
    public ResponseEntity<List<AttendanceResponseDto>> markAttendance(@Valid @RequestBody AttendanceRequestDto request) {
        log.info("Request received to mark attendance for Subject ID: {}, Batch ID: {}, Date: {}", 
                request.getSubjectId(), request.getBatchId(), request.getDate());
        return ResponseEntity.ok(attendanceService.markAttendance(request));
    }

    @PutMapping("/edit")
    @PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
    @Operation(summary = "Edit existing attendance with audit trail", description = "Modifies one state record and appends a row in the audit table.")
    public ResponseEntity<AttendanceResponseDto> editAttendance(
            @RequestParam UUID recordId,
            @RequestParam String newStatus,
            @RequestParam String remarks) {
        log.info("Attendance edit request for record ID: {}, New Status: {}", recordId, newStatus);
        return ResponseEntity.ok(attendanceService.editAttendance(recordId, newStatus, remarks));
    }

    @GetMapping("/history/student/{studentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get student history")
    public ResponseEntity<List<AttendanceResponseDto>> getStudentHistory(
            @PathVariable UUID studentId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(attendanceService.getStudentAttendanceHistory(studentId, startDate, endDate));
    }

    @GetMapping("/audits")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List audit records")
    public ResponseEntity<List<AttendanceAuditDto>> getAuditTrail() {
        return ResponseEntity.ok(attendanceService.getAuditLogs());
    }
}`
  },
  {
    name: "AttendanceService.java",
    language: "java",
    path: "src/main/java/com/uams/service/AttendanceService.java",
    content: `package com.uams.service;

import com.uams.dto.AttendanceRequestDto;
import com.uams.dto.AttendanceResponseDto;
import com.uams.dto.AttendanceAuditDto;
import com.uams.entity.Attendance;
import com.uams.entity.AttendanceAudit;
import com.uams.entity.Student;
import com.uams.repository.AttendanceAuditRepository;
import com.uams.repository.AttendanceRepository;
import com.uams.repository.StudentRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final AttendanceAuditRepository auditRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public List<AttendanceResponseDto> markAttendance(AttendanceRequestDto dto) {
        return dto.getRecords().stream().map(record -> {
            Attendance attend = attendanceRepository.findByStudentIdAndSubjectIdAndDate(
                    record.getStudentId(), dto.getSubjectId(), dto.getDate()
            ).orElse(new Attendance());

            attend.setStudentId(record.getStudentId());
            attend.setSubjectId(dto.getSubjectId());
            attend.setBatchId(dto.getBatchId());
            attend.setDate(dto.getDate());
            attend.setStatus(record.getStatus()); // 'PRESENT' or 'ABSENT'
            
            Attendance saved = attendanceRepository.save(attend);
            return mapToDto(saved);
        }).collect(Collectors.toList());
    }

    @Transactional
    public AttendanceResponseDto editAttendance(UUID recordId, String newStatus, String remarks) {
        Attendance current = attendanceRepository.findById(recordId)
                .orElseThrow(() -> new EntityNotFoundException("Record not found with ID: " + recordId));

        String previousStatus = current.getStatus();
        String modifiedBy = SecurityContextHolder.getContext().getAuthentication().getName();

        current.setStatus(newStatus);
        Attendance saved = attendanceRepository.save(current);

        // Audit Trail Entry
        AttendanceAudit audit = AttendanceAudit.builder()
                .id(UUID.randomUUID())
                .attendanceRecordId(recordId)
                .modifiedBy(modifiedBy)
                .modifiedDate(LocalDateTime.now())
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .remarks(remarks)
                .build();
        auditRepository.save(audit);

        log.info("Audit entry inserted for record ID: {} by user: {}", recordId, modifiedBy);
        return mapToDto(saved);
    }

    public List<AttendanceResponseDto> getStudentAttendanceHistory(UUID studentId, LocalDate start, LocalDate end) {
        return attendanceRepository.findHistory(studentId, start, end)
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    public List<AttendanceAuditDto> getAuditLogs() {
        return auditRepository.findAll().stream().map(audit -> 
            new AttendanceAuditDto(
                audit.getId(),
                audit.getAttendanceRecordId(),
                audit.getModifiedBy(),
                audit.getModifiedDate(),
                audit.getPreviousStatus(),
                audit.getNewStatus(),
                audit.getRemarks()
            )
        ).collect(Collectors.toList());
    }

    private AttendanceResponseDto mapToDto(Attendance entity) {
        Student stu = studentRepository.findById(entity.getStudentId()).orElse(null);
        return AttendanceResponseDto.builder()
                .id(entity.getId())
                .studentId(entity.getStudentId())
                .studentName(stu != null ? stu.getFullName() : "Unknown Student")
                .rollNumber(stu != null ? stu.getRollNumber() : "N/A")
                .subjectId(entity.getSubjectId())
                .batchId(entity.getBatchId())
                .date(entity.getDate())
                .status(entity.getStatus())
                .build();
    }
}`
  },
  {
    name: "JwtSecurityConfig.java",
    language: "java",
    path: "src/main/java/com/uams/security/JwtSecurityConfig.java",
    content: `package com.uams.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class JwtSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final JwtAuthenticationEntryPoint entryPoint;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(ex -> ex.authenticationEntryPoint(entryPoint))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // BCrypt standard hash
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}`
  }
];

export const flutterCodeFiles: CodeFile[] = [
  {
    name: "api_client.dart",
    language: "dart",
    path: "lib/core/network/api_client.dart",
    content: `import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  final Dio dio;
  final FlutterSecureStorage secureStorage;

  ApiClient({required this.dio, required this.secureStorage}) {
    dio.options.baseUrl = 'https://api.university-uams.edu/api/v1';
    dio.options.connectTimeout = const Duration(seconds: 15);
    dio.options.receiveTimeout = const Duration(seconds: 15);

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await secureStorage.read(key: 'jwt_access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          if (e.response?.statusCode == 401) {
            // Initiate Token Refresh Flow
            final success = await _refreshToken();
            if (success) {
              final renewedToken = await secureStorage.read(key: 'jwt_access_token');
              e.requestOptions.headers['Authorization'] = 'Bearer $renewedToken';
              
              // Retry outstanding request
              final response = await dio.fetch(e.requestOptions);
              return handler.resolve(response);
            }
          }
          return handler.next(e);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await secureStorage.read(key: 'jwt_refresh_token');
    if (refreshToken == null) return false;

    try {
      final response = await Dio().post(
        'https://api.university-uams.edu/api/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      if (response.statusCode == 200) {
        final newAccess = response.data['accessToken'];
        final newRefresh = response.data['refreshToken'];
        await secureStorage.write(key: 'jwt_access_token', value: newAccess);
        await secureStorage.write(key: 'jwt_refresh_token', value: newRefresh);
        return true;
      }
    } catch (_) {}
    return false;
  }
}`
  },
  {
    name: "attendance_provider.dart",
    language: "dart",
    path: "lib/features/attendance/providers/attendance_provider.dart",
    content: `import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uams_app/features/attendance/models/attendance_model.dart';
import 'package:uams_app/core/network/api_client.dart';

class AttendanceNotifier extends StateNotifier<AsyncValue<List<AttendanceModel>>> {
  final ApiClient apiClient;

  AttendanceNotifier(this.apiClient) : super(const AsyncValue.loading());

  Future<void> submitAttendance({
    required String subjectId,
    required String batchId,
    required DateTime date,
    required List<Map<String, dynamic>> records,
  }) async {
    state = const AsyncValue.loading();
    try {
      final response = await apiClient.dio.post('/attendance/mark', data: {
        'subjectId': subjectId,
        'batchId': batchId,
        'date': date.toIso8601String().split('T')[0],
        'records': records,
      });
      final List data = response.data;
      final list = data.map((x) => AttendanceModel.fromJson(x)).toList();
      state = AsyncValue.data(list);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> modifyIndividualAttendance({
    required String recordId,
    required String newStatus,
    required String remarks,
  }) async {
    try {
      await apiClient.dio.put(
        '/attendance/edit',
        queryParameters: {
          'recordId': recordId,
          'newStatus': newStatus,
          'remarks': remarks,
        },
      );
    } catch (e) {
      rethrow;
    }
  }
}

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AsyncValue<List<AttendanceModel>>>((ref) {
  final client = ref.watch(apiClientProvider);
  return AttendanceNotifier(client);
});`
  },
  {
    name: "teacher_attendance_screen.dart",
    language: "dart",
    path: "lib/features/attendance/views/teacher_attendance_screen.dart",
    content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/attendance_provider.dart';

class TeacherAttendanceScreen extends ConsumerStatefulWidget {
  final String batchId;
  final String subjectId;
  final String batchName;

  const TeacherAttendanceScreen({
    super.key,
    required this.batchId,
    required this.subjectId,
    required this.batchName,
  });

  @override
  ConsumerState<TeacherAttendanceScreen> createState() => _TeacherAttendanceScreenState();
}

class _TeacherAttendanceScreenState extends ConsumerState<TeacherAttendanceScreen> {
  final Map<String, bool> _attendanceMap = {};
  List<dynamic> _students = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchStudents();
  }

  Future<void> _fetchStudents() async {
    // In actual implementation, fetch from client, populate _attendanceMap
    setState(() {
      _students = [
        {'id': 's1', 'name': 'John Doe', 'roll': 'CS501'},
        {'id': 's2', 'name': 'Rahul Sharma', 'roll': 'CS502'},
        {'id': 's3', 'name': 'Priya Singh', 'roll': 'CS503'},
        {'id': 's4', 'name': 'Alice Thomas', 'roll': 'CS504'},
      ];
      for (var f in _students) {
        _attendanceMap[f['id']] = true; // Default to present
      }
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Mark: \${widget.batchName}'),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total Students: \${_students.length}', style: Theme.of(context).textTheme.titleMedium),
                    Text('Date: Today', style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _students.length,
                  itemBuilder: (context, i) {
                    final s = _students[i];
                    return CheckboxListTile(
                      title: Text(s['name']),
                      subtitle: Text('Roll: \${s['roll']}'),
                      value: _attendanceMap[s['id']],
                      onChanged: (val) {
                        setState(() {
                          _attendanceMap[s['id']] = val ?? false;
                        });
                      },
                    );
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    final list = _students.map((s) => {
                      'studentId': s['id'],
                      'status': _attendanceMap[s['id']]! ? 'PRESENT' : 'ABSENT',
                    }).toList();

                    await ref.read(attendanceProvider.notifier).submitAttendance(
                      subjectId: widget.subjectId,
                      batchId: widget.batchId,
                      date: DateTime.now(),
                      records: list,
                    );

                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Attendance Saved Successfully!')),
                      );
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Save Attendance'),
                ),
              )
            ],
          ),
    );
  }
}`
  }
];

export const postgresSchema: CodeFile = {
  name: "schema.sql",
  language: "sql",
  path: "postgresql/schema.sql",
  content: `-- Production-grade Database Schema for UAMS 
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES TABLE
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(30) UNIQUE NOT NULL
);

-- USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DEPARTMENTS TABLE
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dept_name VARCHAR(100) UNIQUE NOT NULL,
    dept_code VARCHAR(15) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BATCHES TABLE
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_name VARCHAR(100) UNIQUE NOT NULL,
    semester INT NOT NULL CHECK (semester >= 1 AND semester <= 8),
    academic_year VARCHAR(15) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE
);

-- TEACHERS TABLE
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- STUDENTS TABLE
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_number VARCHAR(50) UNIQUE NOT NULL,
    roll_number VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    semester INT NOT NULL,
    profile_photo_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SUBJECTS TABLE
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    assigned_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL
);

-- TEACHER_SUBJECTS CONTEXT (N:M relationship if a subject is shared or mapped recursively)
CREATE TABLE teacher_subjects (
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

-- ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(15) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_daily_attendance UNIQUE (student_id, subject_id, attendance_date)
);

-- ATTENDANCE AUDIT LOGS TABLE
CREATE TABLE attendance_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_record_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    modified_by VARCHAR(100) NOT NULL,
    modified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    previous_status VARCHAR(15) NOT NULL,
    new_status VARCHAR(15) NOT NULL,
    remarks TEXT
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- REFRESH_TOKENS TABLE
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- PERFORMANCE INDEXESFOR HIGH READ/WRITE EFFICIENCY (10,000+ Students)
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_subject_id ON attendance(subject_id);
CREATE INDEX idx_attendance_date ON attendance(attendance_date);
CREATE INDEX idx_attendance_batch_id ON attendance(batch_id);
CREATE INDEX idx_students_batch_id ON students(batch_id);
CREATE INDEX idx_subjects_teacher_id ON subjects(assigned_teacher_id);
`
};

export const deploymentFiles: CodeFile[] = [
  {
    name: "docker-compose.yml",
    language: "yaml",
    path: "docker/docker-compose.yml",
    content: `version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: uams-postgres-db
    environment:
      POSTGRES_DB: uams_db
      POSTGRES_USER: uams_admin
      POSTGRES_PASSWORD: SecretProductionPassword123!
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - uams-network
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1024M
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uams_admin -d uams_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: uams-spring-backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=prod
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/uams_db
      - SPRING_DATASOURCE_USERNAME=uams_admin
      - SPRING_DATASOURCE_PASSWORD=SecretProductionPassword123!
      - JWT_SECRET=ProductionSuperSecretKeyWithMinimumLengthOf256BitsRequiredByHMACSHA
      - JWT_EXPIRATION_MS=3600000
      - REFRESH_TOKEN_EXPIRATION_MS=604800000
    depends_on:
      db:
        condition: service_healthy
    networks:
      - uams-network
    restart: always

volumes:
  pgdata:

networks:
  uams-network:
    driver: bridge`
  },
  {
    name: "ci-cd-pipeline.yml",
    language: "yaml",
    path: ".github/workflows/ci-cd-pipeline.yml",
    content: `name: UAMS CI/CD Production Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3

    - name: Set up JDK 21
      uses: actions/setup-java@v3
      with:
        java-version: '21'
        distribution: 'temurin'
        cache: maven

    - name: Build Spring Boot Backend with Maven
      run: mvn -B clean package -DskipTests

    - name: Run Spring Boot Unit and Integration Tests
      run: mvn test

    - name: Set up Flutter
      uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.19.x'
        channel: 'stable'

    - name: Pull Flutter Dependencies
      run: |
        flutter pub get
        flutter analyze

  dockerize-and-deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: \${{ secrets.DOCKER_USERNAME }}
        password: \${{ secrets.DOCKER_PASSWORD }}

    - name: Build and Push Backend Image
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: universityapps/uams-backend:latest

    - name: Production Deployment Deploy Key Setup
      uses: appleboy/scp-action@master
      with:
        host: \${{ secrets.SSH_HOST }}
        username: \${{ secrets.SSH_USER }}
        key: \${{ secrets.SSH_PRIVATE_KEY }}
        source: "docker/docker-compose.yml"
        target: "~/uams"

    - name: Execute Pull and Restart via SSH
      uses: appleboy/ssh-action@master
      with:
        host: \${{ secrets.SSH_HOST }}
        username: \${{ secrets.SSH_USER }}
        key: \${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd ~/uams/docker
          docker compose pull
          docker compose up -d --remove-orphans
          echo "Deployment deployed successfully automatically!"`
  }
];
