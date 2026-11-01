import bcrypt from "bcryptjs";
import { pool, db } from "@/db";
import * as schema from "@/db/schema";
import { sql } from "drizzle-orm";

const SCHEMA_DDL = `
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'faculty', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.complaint_status AS ENUM ('submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.complaint_category AS ENUM ('wifi_internet', 'classroom', 'laboratory', 'electricity', 'washroom', 'cleanliness', 'transport', 'library', 'cafeteria', 'security', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM ('academic', 'cultural', 'sports', 'seminar', 'workshop', 'society', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lost_found_status AS ENUM ('lost', 'found', 'claimed', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'alert', 'complaint', 'academic', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.departments (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  faculty varchar(200) NOT NULL,
  description text,
  "headName" varchar(200),
  "contactEmail" varchar(200),
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS departments_code_idx ON public.departments (code);

CREATE TABLE IF NOT EXISTS public.programs (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  level varchar(50) NOT NULL,
  "durationYears" integer NOT NULL,
  "totalSemesters" integer NOT NULL,
  "departmentId" integer NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  description text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS programs_department_idx ON public.programs ("departmentId");

CREATE TABLE IF NOT EXISTS public.buildings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  "shortName" varchar(50),
  description text,
  floors integer NOT NULL DEFAULT 1,
  "posX" real NOT NULL DEFAULT 0,
  "posZ" real NOT NULL DEFAULT 0,
  width real NOT NULL DEFAULT 10,
  depth real NOT NULL DEFAULT 10,
  height real NOT NULL DEFAULT 8,
  color varchar(20) NOT NULL DEFAULT '#3b82f6',
  facilities jsonb DEFAULT '[]'::jsonb,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campus_locations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "buildingId" integer NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  type varchar(50) NOT NULL,
  floor integer NOT NULL DEFAULT 1,
  capacity integer,
  facilities jsonb DEFAULT '[]'::jsonb,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS locations_building_idx ON public.campus_locations ("buildingId");
CREATE INDEX IF NOT EXISTS locations_type_idx ON public.campus_locations (type);

CREATE TABLE IF NOT EXISTS public.users (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email varchar(200) NOT NULL UNIQUE,
  username varchar(100) UNIQUE,
  "passwordHash" varchar(255) NOT NULL,
  role public.user_role NOT NULL,
  "fullName" varchar(200) NOT NULL,
  "avatarUrl" varchar(500),
  phone varchar(50),
  "isActive" boolean NOT NULL DEFAULT true,
  "isVerified" boolean NOT NULL DEFAULT true,
  "lastLoginAt" timestamptz,
  "mfaEnabled" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users (role);

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  "studentId" varchar(50) NOT NULL UNIQUE,
  "programId" integer REFERENCES public.programs(id),
  "currentSemester" integer NOT NULL DEFAULT 1,
  cgpa real,
  "enrollmentYear" integer NOT NULL,
  "guardianName" varchar(200),
  "guardianPhone" varchar(50),
  address text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_profiles_student_id_idx ON public.student_profiles ("studentId");
CREATE INDEX IF NOT EXISTS student_profiles_program_idx ON public.student_profiles ("programId");

CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  "employeeId" varchar(50) NOT NULL UNIQUE,
  "departmentId" integer REFERENCES public.departments(id),
  designation varchar(100) NOT NULL,
  specialization varchar(300),
  "officeRoom" varchar(100),
  qualification varchar(300),
  "joiningYear" integer,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS faculty_profiles_dept_idx ON public.faculty_profiles ("departmentId");

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  "employeeId" varchar(50) NOT NULL UNIQUE,
  "departmentId" integer REFERENCES public.departments(id),
  designation varchar(100) NOT NULL,
  scope varchar(100) NOT NULL DEFAULT 'department',
  permissions jsonb DEFAULT '[]'::jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code varchar(20) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  "creditHours" integer NOT NULL,
  "departmentId" integer REFERENCES public.departments(id),
  description text,
  semester integer,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS courses_code_idx ON public.courses (code);

CREATE TABLE IF NOT EXISTS public.course_sections (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "courseId" integer NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  "sectionCode" varchar(10) NOT NULL,
  "facultyUserId" integer REFERENCES public.users(id),
  semester varchar(20) NOT NULL,
  year integer NOT NULL,
  "scheduleJson" jsonb,
  "maxCapacity" integer NOT NULL DEFAULT 40,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_course_section_semester UNIQUE ("courseId", "sectionCode", semester, year)
);
CREATE INDEX IF NOT EXISTS sections_course_idx ON public.course_sections ("courseId");
CREATE INDEX IF NOT EXISTS sections_faculty_idx ON public.course_sections ("facultyUserId");

CREATE TABLE IF NOT EXISTS public.enrollments (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "studentUserId" integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "sectionId" integer NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  status varchar(30) NOT NULL DEFAULT 'active',
  "enrolledAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_section UNIQUE ("studentUserId", "sectionId")
);
CREATE INDEX IF NOT EXISTS enrollments_student_idx ON public.enrollments ("studentUserId");

CREATE TABLE IF NOT EXISTS public.assignments (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "sectionId" integer NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL,
  description text,
  "totalMarks" integer NOT NULL DEFAULT 100,
  "dueDate" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title varchar(200) NOT NULL,
  content text NOT NULL,
  audience varchar(50) NOT NULL DEFAULT 'all',
  "departmentId" integer REFERENCES public.departments(id),
  "authorUserId" integer REFERENCES public.users(id),
  "isPinned" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaints (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "trackingId" varchar(20) NOT NULL UNIQUE,
  "submitterUserId" integer NOT NULL REFERENCES public.users(id),
  category public.complaint_category NOT NULL,
  title varchar(200) NOT NULL,
  description text NOT NULL,
  "buildingId" integer REFERENCES public.buildings(id),
  "locationId" integer REFERENCES public.campus_locations(id),
  "roomDescription" varchar(200),
  priority public.complaint_priority NOT NULL DEFAULT 'medium',
  status public.complaint_status NOT NULL DEFAULT 'submitted',
  "assignedDepartmentId" integer REFERENCES public.departments(id),
  "assignedToUserId" integer REFERENCES public.users(id),
  "aiClassification" jsonb,
  "attachmentUrls" jsonb DEFAULT '[]'::jsonb,
  "resolvedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS complaints_tracking_idx ON public.complaints ("trackingId");
CREATE INDEX IF NOT EXISTS complaints_submitter_idx ON public.complaints ("submitterUserId");
CREATE INDEX IF NOT EXISTS complaints_status_idx ON public.complaints (status);
CREATE INDEX IF NOT EXISTS complaints_category_idx ON public.complaints (category);

CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "complaintId" integer NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  "authorUserId" integer REFERENCES public.users(id),
  message text NOT NULL,
  "statusChange" public.complaint_status,
  "isInternal" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title varchar(200) NOT NULL,
  description text,
  type public.event_type NOT NULL DEFAULT 'academic',
  organizer varchar(200),
  location varchar(200),
  "buildingId" integer REFERENCES public.buildings(id),
  "startDate" timestamptz NOT NULL,
  "endDate" timestamptz,
  "maxAttendees" integer,
  "requiresRegistration" boolean NOT NULL DEFAULT false,
  "imageUrl" varchar(500),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "eventId" integer NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  "userId" integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "registeredAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_event_user UNIQUE ("eventId", "userId")
);

CREATE TABLE IF NOT EXISTS public.lost_found_items (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "reporterUserId" integer NOT NULL REFERENCES public.users(id),
  type public.lost_found_status NOT NULL,
  title varchar(200) NOT NULL,
  description text NOT NULL,
  location varchar(200),
  "buildingId" integer REFERENCES public.buildings(id),
  "reportedDate" timestamptz NOT NULL,
  "contactMethod" varchar(200),
  status varchar(30) NOT NULL DEFAULT 'open',
  "imageUrl" varchar(500),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'info',
  title varchar(200) NOT NULL,
  message text NOT NULL,
  link varchar(500),
  "isRead" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications ("userId");
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications ("userId", "isRead");

CREATE TABLE IF NOT EXISTS public.feedback (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer REFERENCES public.users(id),
  category varchar(50) NOT NULL,
  title varchar(200) NOT NULL,
  message text NOT NULL,
  "isAnonymous" boolean NOT NULL DEFAULT false,
  status varchar(30) NOT NULL DEFAULT 'new',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title varchar(300) NOT NULL,
  category varchar(100) NOT NULL,
  content text NOT NULL,
  source varchar(500),
  "uploadedByUserId" integer REFERENCES public.users(id),
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer REFERENCES public.users(id),
  module varchar(50) NOT NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  sources jsonb,
  "tokensUsed" integer,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" integer REFERENCES public.users(id),
  action varchar(100) NOT NULL,
  "entityType" varchar(100) NOT NULL,
  "entityId" integer,
  metadata jsonb,
  "ipAddress" varchar(100),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_action_idx ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_user_idx ON public.audit_logs ("userId");
CREATE INDEX IF NOT EXISTS audit_created_idx ON public.audit_logs ("createdAt");

CREATE TABLE IF NOT EXISTS public.system_settings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key varchar(100) NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_bookings (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "locationId" integer NOT NULL REFERENCES public.campus_locations(id) ON DELETE CASCADE,
  "bookedByUserId" integer NOT NULL REFERENCES public.users(id),
  title varchar(200) NOT NULL,
  "startTime" timestamptz NOT NULL,
  "endTime" timestamptz NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'approved',
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
`;

const globalBootstrap = globalThis as typeof globalThis & {
  __airCampusDbReady?: boolean;
  __airCampusDbBootstrapPromise?: Promise<void> | null;
};

async function seedInitialCampusData() {
  const [superAdminHash, adminHash, facultyHash, studentHash] = await Promise.all([
    bcrypt.hash("Super@123", 10),
    bcrypt.hash("Admin@123", 10),
    bcrypt.hash("Faculty@123", 10),
    bcrypt.hash("Student@123", 10),
  ]);

  // 1. Departments
  await db
    .insert(schema.departments)
    .values([
      {
        code: "CS",
        name: "Department of Computer Science",
        faculty: "Faculty of Computing & AI",
        description: "Offers BS Computer Science with emphasis on software engineering, algorithms, and systems.",
        contactEmail: "cs.karachi@au.edu.pk",
      },
      {
        code: "AI",
        name: "Department of Artificial Intelligence",
        faculty: "Faculty of Computing & AI",
        description: "BS AI program focused on machine learning, deep learning, and intelligent systems.",
        contactEmail: "ai.karachi@au.edu.pk",
      },
      {
        code: "DS",
        name: "Department of Data Science",
        faculty: "Faculty of Computing & AI",
        description: "BS Data Science combining statistics, programming, and domain expertise.",
        contactEmail: "ds.karachi@au.edu.pk",
      },
      {
        code: "CY",
        name: "Department of Cyber Security",
        faculty: "Faculty of Computing & AI",
        description: "BS Cyber Security covering network security, cryptography, and ethical hacking.",
        contactEmail: "cyber.karachi@au.edu.pk",
      },
      {
        code: "BBA",
        name: "Air University School of Management",
        faculty: "Air University School of Management",
        description: "Business and management programs including BBA, FinTech, Accounting & Finance.",
        contactEmail: "ausom.karachi@au.edu.pk",
      },
      {
        code: "SSH",
        name: "Department of Social Sciences & Humanities",
        faculty: "Faculty of Social Sciences",
        description: "Programs in English and Psychology.",
        contactEmail: "ssh.karachi@au.edu.pk",
      },
      {
        code: "ADMIN",
        name: "Campus Administration",
        faculty: "Administration",
        description: "Administrative and operational services.",
      },
    ])
    .onConflictDoNothing();

  const allDepts = await db.select().from(schema.departments);
  const deptMap: Record<string, number> = {};
  allDepts.forEach((d) => (deptMap[d.code] = d.id));

  // 2. Programs
  await db
    .insert(schema.programs)
    .values([
      { code: "BS-CS", name: "BS Computer Science", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.CS },
      { code: "BS-AI", name: "BS Artificial Intelligence", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.AI },
      { code: "BS-DS", name: "BS Data Science", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.DS },
      { code: "BS-CY", name: "BS Cyber Security", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.CY },
      { code: "BBA", name: "Bachelor of Business Administration", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.BBA },
      { code: "BS-FT", name: "BS FinTech", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.BBA },
      { code: "BS-AF", name: "BS Accounting & Finance", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.BBA },
      { code: "BS-AM", name: "BS Aviation Management", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.BBA },
      { code: "BS-EN", name: "BS English", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.SSH },
      { code: "BS-PSY", name: "BS Psychology", level: "BS", durationYears: 4, totalSemesters: 8, departmentId: deptMap.SSH },
    ])
    .onConflictDoNothing();

  // 3. Buildings
  await db
    .insert(schema.buildings)
    .values([
      { code: "MAIN", name: "Main Academic Block", shortName: "Main Block", posX: 50, posZ: 30, width: 22, depth: 14, height: 12, color: "#2563eb", floors: 3, description: "Primary academic building housing classrooms, faculty offices, and administrative departments.", facilities: ["Classrooms", "Faculty Offices", "Dean's Office", "Exam Cell"] },
      { code: "CS-BLOCK", name: "Computing & AI Block", shortName: "CS Block", posX: 25, posZ: 50, width: 18, depth: 14, height: 10, color: "#0891b2", floors: 3, description: "Dedicated block for Computing and AI departments with modern computer labs.", facilities: ["Computer Labs", "AI Research Lab", "Cybersecurity Lab", "Seminar Hall"] },
      { code: "LIB", name: "Central Library", shortName: "Library", posX: 75, posZ: 50, width: 16, depth: 14, height: 9, color: "#7c3aed", floors: 2, description: "University library with digital and physical collections.", facilities: ["Reading Hall", "Digital Resources", "Study Rooms", "E-Journals"] },
      { code: "ADMIN", name: "Administration Building", shortName: "Admin", posX: 50, posZ: 70, width: 16, depth: 10, height: 8, color: "#059669", floors: 2, description: "Administrative offices including admissions, accounts, and student affairs.", facilities: ["Admissions", "Accounts", "Student Affairs", "VC Office"] },
      { code: "CAF", name: "Cafeteria & Student Center", shortName: "Cafeteria", posX: 20, posZ: 25, width: 14, depth: 10, height: 6, color: "#ea580c", floors: 1, description: "Campus cafeteria and student activity center.", facilities: ["Food Court", "Student Lounge", "Society Rooms"] },
      { code: "SPORTS", name: "Sports Complex", shortName: "Sports", posX: 82, posZ: 25, width: 16, depth: 12, height: 7, color: "#dc2626", floors: 1, description: "Indoor and outdoor sports facilities.", facilities: ["Gymnasium", "Indoor Court", "Changing Rooms"] },
      { code: "AUD", name: "Auditorium", shortName: "Auditorium", posX: 50, posZ: 10, width: 18, depth: 10, height: 10, color: "#b45309", floors: 1, description: "Main auditorium for events, seminars, and ceremonies.", facilities: ["Main Hall", "Stage", "AV Room"] },
    ])
    .onConflictDoNothing();

  const allBuildings = await db.select().from(schema.buildings);
  const buildingMap: Record<string, number> = {};
  allBuildings.forEach((b) => (buildingMap[b.code] = b.id));

  // 4. Campus Locations
  const existingLocations = await db.select({ id: schema.campusLocations.id }).from(schema.campusLocations).limit(1);
  if (existingLocations.length === 0) {
    await db.insert(schema.campusLocations).values([
      { buildingId: buildingMap.MAIN, name: "Room 101 - Lecture Hall A", type: "classroom", floor: 1, capacity: 60, facilities: ["Projector", "AC", "Whiteboard"] },
      { buildingId: buildingMap.MAIN, name: "Room 102 - Lecture Hall B", type: "classroom", floor: 1, capacity: 60, facilities: ["Projector", "AC"] },
      { buildingId: buildingMap.MAIN, name: "Room 201 - Tutorial Room", type: "classroom", floor: 2, capacity: 30, facilities: ["Projector"] },
      { buildingId: buildingMap.MAIN, name: "Dean's Office - Computing", type: "office", floor: 2 },
      { buildingId: buildingMap["CS-BLOCK"], name: "CS Lab A - Programming", type: "lab", floor: 1, capacity: 40, facilities: ["40 Workstations", "Linux", "Python", "Java"] },
      { buildingId: buildingMap["CS-BLOCK"], name: "CS Lab B - Networks", type: "lab", floor: 1, capacity: 30, facilities: ["Networking Equipment", "Cisco Routers"] },
      { buildingId: buildingMap["CS-BLOCK"], name: "AI Research Lab", type: "lab", floor: 2, capacity: 25, facilities: ["GPU Workstations", "ML Frameworks"] },
      { buildingId: buildingMap["CS-BLOCK"], name: "Cybersecurity Lab", type: "lab", floor: 2, capacity: 25, facilities: ["Isolated Network", "Security Tools"] },
      { buildingId: buildingMap.LIB, name: "Main Reading Hall", type: "library", floor: 1, capacity: 120, facilities: ["Silent Zone", "WiFi"] },
      { buildingId: buildingMap.LIB, name: "Digital Resources Room", type: "library", floor: 2, capacity: 40, facilities: ["Computers", "E-Journals"] },
      { buildingId: buildingMap.ADMIN, name: "Admissions Office", type: "office", floor: 1 },
      { buildingId: buildingMap.ADMIN, name: "Student Affairs", type: "office", floor: 1 },
      { buildingId: buildingMap.ADMIN, name: "Accounts Office", type: "office", floor: 1 },
      { buildingId: buildingMap.CAF, name: "Main Dining Area", type: "cafeteria", floor: 1, capacity: 200 },
      { buildingId: buildingMap.CAF, name: "Student Lounge", type: "lounge", floor: 1, capacity: 60 },
    ]);
  }

  // 5. Demo Users
  await db
    .insert(schema.users)
    .values([
      { email: "superadmin@aircampus.demo", username: "superadmin", passwordHash: superAdminHash, role: "super_admin", fullName: "Platform Super Admin" },
      { email: "admin@aircampus.demo", username: "admin.cs", passwordHash: adminHash, role: "admin", fullName: "Dr. Ayesha Khan" },
      { email: "admin2@aircampus.demo", username: "admin.facilities", passwordHash: adminHash, role: "admin", fullName: "Mr. Bilal Ahmed" },
      { email: "faculty@aircampus.demo", username: "faculty.ali", passwordHash: facultyHash, role: "faculty", fullName: "Dr. Ahmed Ali" },
      { email: "faculty2@aircampus.demo", username: "faculty.fatima", passwordHash: facultyHash, role: "faculty", fullName: "Dr. Fatima Zahra" },
      { email: "student@aircampus.demo", username: "210401001", passwordHash: studentHash, role: "student", fullName: "Sara Malik" },
      { email: "student2@aircampus.demo", username: "210401002", passwordHash: studentHash, role: "student", fullName: "Hassan Raza" },
    ])
    .onConflictDoNothing();

  const allUsers = await db.select().from(schema.users);
  const userByEmail: Record<string, (typeof allUsers)[0]> = {};
  allUsers.forEach((u) => (userByEmail[u.email] = u));

  const superAdminUser = userByEmail["superadmin@aircampus.demo"];
  const adminUser = userByEmail["admin@aircampus.demo"];
  const adminUser2 = userByEmail["admin2@aircampus.demo"];
  const facultyUser = userByEmail["faculty@aircampus.demo"];
  const facultyUser2 = userByEmail["faculty2@aircampus.demo"];
  const studentUser = userByEmail["student@aircampus.demo"];
  const studentUser2 = userByEmail["student2@aircampus.demo"];

  // 6. Role Profiles (always ensured so login role-profile checks succeed)
  if (adminUser && adminUser2) {
    await db
      .insert(schema.adminProfiles)
      .values([
        { userId: adminUser.id, employeeId: "ADM-001", departmentId: deptMap.CS, designation: "Department Coordinator", scope: "department", permissions: ["complaints.manage", "faculty.view", "students.view", "announcements.manage"] },
        { userId: adminUser2.id, employeeId: "ADM-002", departmentId: deptMap.ADMIN, designation: "Facilities Manager", scope: "campus", permissions: ["complaints.manage", "facilities.manage", "maintenance.manage"] },
      ])
      .onConflictDoNothing();
  }

  if (facultyUser && facultyUser2) {
    await db
      .insert(schema.facultyProfiles)
      .values([
        { userId: facultyUser.id, employeeId: "FAC-001", departmentId: deptMap.CS, designation: "Assistant Professor", specialization: "Machine Learning & AI", officeRoom: "Main Block Room 210", qualification: "PhD Computer Science", joiningYear: 2018 },
        { userId: facultyUser2.id, employeeId: "FAC-002", departmentId: deptMap.AI, designation: "Lecturer", specialization: "Natural Language Processing", officeRoom: "CS Block Room 205", qualification: "MS Artificial Intelligence", joiningYear: 2021 },
      ])
      .onConflictDoNothing();
  }

  const programsAll = await db.select().from(schema.programs);
  const bsCs = programsAll.find((p) => p.code === "BS-CS") || programsAll[0];

  if (studentUser && studentUser2 && bsCs) {
    await db
      .insert(schema.studentProfiles)
      .values([
        { userId: studentUser.id, studentId: "210401001", programId: bsCs.id, currentSemester: 5, cgpa: 3.62, enrollmentYear: 2021 },
        { userId: studentUser2.id, studentId: "210401002", programId: bsCs.id, currentSemester: 5, cgpa: 3.45, enrollmentYear: 2021 },
      ])
      .onConflictDoNothing();
  }

  // 7. Courses, Sections, Enrollments & Assignments
  await db
    .insert(schema.courses)
    .values([
      { code: "CS-301", name: "Data Structures & Algorithms", creditHours: 3, departmentId: deptMap.CS, semester: 5 },
      { code: "CS-305", name: "Database Systems", creditHours: 3, departmentId: deptMap.CS, semester: 5 },
      { code: "AI-301", name: "Introduction to Machine Learning", creditHours: 3, departmentId: deptMap.AI, semester: 5 },
      { code: "CS-310", name: "Software Engineering", creditHours: 3, departmentId: deptMap.CS, semester: 5 },
      { code: "CS-201", name: "Object Oriented Programming", creditHours: 3, departmentId: deptMap.CS, semester: 3 },
    ])
    .onConflictDoNothing();

  const allCourses = await db.select().from(schema.courses);
  const dsa = allCourses.find((c) => c.code === "CS-301");
  const dbCourse = allCourses.find((c) => c.code === "CS-305");
  const ml = allCourses.find((c) => c.code === "AI-301");
  const se = allCourses.find((c) => c.code === "CS-310");

  if (dsa && dbCourse && ml && se && facultyUser && facultyUser2) {
    await db
      .insert(schema.courseSections)
      .values([
        { courseId: dsa.id, sectionCode: "A", facultyUserId: facultyUser.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Mon", "Wed"], startTime: "09:00", endTime: "10:30", room: "Main Block 101" }, maxCapacity: 40 },
        { courseId: dbCourse.id, sectionCode: "A", facultyUserId: facultyUser.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Tue", "Thu"], startTime: "11:00", endTime: "12:30", room: "CS Lab A" }, maxCapacity: 40 },
        { courseId: ml.id, sectionCode: "A", facultyUserId: facultyUser2.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Mon", "Fri"], startTime: "14:00", endTime: "15:30", room: "AI Research Lab" }, maxCapacity: 35 },
        { courseId: se.id, sectionCode: "A", facultyUserId: facultyUser.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Wed", "Fri"], startTime: "09:00", endTime: "10:30", room: "Main Block 201" }, maxCapacity: 40 },
      ])
      .onConflictDoNothing();
  }

  const allSections = await db.select().from(schema.courseSections);
  if (studentUser && studentUser2 && allSections.length > 0) {
    for (const section of allSections) {
      await db
        .insert(schema.enrollments)
        .values([
          { studentUserId: studentUser.id, sectionId: section.id },
          { studentUserId: studentUser2.id, sectionId: section.id },
        ])
        .onConflictDoNothing();
    }

    const existingAssignments = await db.select({ id: schema.assignments.id }).from(schema.assignments).limit(1);
    if (existingAssignments.length === 0 && allSections.length >= 3) {
      await db.insert(schema.assignments).values([
        { sectionId: allSections[0].id, title: "Assignment 1: Binary Search Trees", description: "Implement AVL tree with insertion, deletion and balancing.", totalMarks: 50, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        { sectionId: allSections[1].id, title: "Lab 2: SQL Joins & Normalization", description: "Complete the provided SQL exercises on PostgreSQL.", totalMarks: 30, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
        { sectionId: allSections[2].id, title: "Project Proposal: ML Application", description: "Submit a 2-page proposal for your ML project.", totalMarks: 20, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      ]);
    }
  }

  // 8. Demo Complaints
  const existingComplaints = await db.select({ id: schema.complaints.id }).from(schema.complaints).limit(1);
  if (existingComplaints.length === 0 && studentUser && studentUser2) {
    const now = Date.now();
    const demoComplaints = [
      { trackingId: "AUK-10421", submitterUserId: studentUser.id, category: "wifi_internet" as const, title: "WiFi not working in CS Lab A", description: "Internet has been down since morning in CS Lab A. Unable to work on lab tasks.", buildingId: buildingMap["CS-BLOCK"], status: "resolved" as const, priority: "high" as const, assignedDepartmentId: deptMap.CS, daysAgo: 14 },
      { trackingId: "AUK-20814", submitterUserId: studentUser.id, category: "electricity" as const, title: "Power fluctuation in Main Block", description: "Frequent power outages in Main Block classrooms during afternoon classes.", buildingId: buildingMap.MAIN, status: "in_progress" as const, priority: "high" as const, assignedDepartmentId: deptMap.ADMIN, daysAgo: 3 },
      { trackingId: "AUK-31905", submitterUserId: studentUser2.id, category: "washroom" as const, title: "Washroom water issue", description: "No water in the 2nd floor washroom of Main Block.", buildingId: buildingMap.MAIN, status: "submitted" as const, priority: "medium" as const, daysAgo: 1 },
      { trackingId: "AUK-41209", submitterUserId: studentUser.id, category: "cleanliness" as const, title: "Cafeteria tables not cleaned", description: "Tables in cafeteria are not cleaned regularly during lunch hours.", buildingId: buildingMap.CAF, status: "resolved" as const, priority: "low" as const, assignedDepartmentId: deptMap.ADMIN, daysAgo: 20 },
      { trackingId: "AUK-52811", submitterUserId: studentUser2.id, category: "laboratory" as const, title: "Software missing in Lab B", description: "Python 3.11 not installed on workstations in CS Lab B.", buildingId: buildingMap["CS-BLOCK"], status: "assigned" as const, priority: "medium" as const, assignedDepartmentId: deptMap.CS, daysAgo: 5 },
      { trackingId: "AUK-63940", submitterUserId: studentUser.id, category: "classroom" as const, title: "Projector issue in Room 201", description: "Projector in Main Block Room 201 displaying blurry image.", buildingId: buildingMap.MAIN, status: "resolved" as const, priority: "medium" as const, assignedDepartmentId: deptMap.CS, daysAgo: 30 },
      { trackingId: "AUK-74122", submitterUserId: studentUser2.id, category: "library" as const, title: "AC not working in library", description: "Air conditioning in main reading hall not functional for 2 days.", buildingId: buildingMap.LIB, status: "under_review" as const, priority: "medium" as const, daysAgo: 2 },
      { trackingId: "AUK-85319", submitterUserId: studentUser.id, category: "security" as const, title: "CCTV camera not working at gate", description: "Main gate CCTV camera has been out of service for a week.", buildingId: buildingMap.ADMIN, status: "submitted" as const, priority: "high" as const, daysAgo: 0 },
    ];
    for (const c of demoComplaints) {
      const createdAt = new Date(now - c.daysAgo * 24 * 60 * 60 * 1000);
      await db
        .insert(schema.complaints)
        .values({
          trackingId: c.trackingId,
          submitterUserId: c.submitterUserId,
          category: c.category,
          title: c.title,
          description: c.description,
          buildingId: c.buildingId,
          status: c.status,
          priority: c.priority,
          assignedDepartmentId: c.assignedDepartmentId ?? null,
          createdAt,
          updatedAt: createdAt,
          resolvedAt: c.status === "resolved" ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined,
        })
        .onConflictDoNothing();
    }
  }

  // 9. Events & Announcements
  const existingEvents = await db.select({ id: schema.events.id }).from(schema.events).limit(1);
  if (existingEvents.length === 0) {
    await db.insert(schema.events).values([
      {
        title: "AI Research Symposium 2025",
        description: "Annual research symposium featuring student and faculty AI research presentations.",
        type: "seminar",
        organizer: "Department of AI",
        location: "Auditorium",
        buildingId: buildingMap.AUD,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        maxAttendees: 300,
        requiresRegistration: true,
      },
      {
        title: "Career Fair - Tech Companies",
        description: "Leading tech companies visiting campus for recruitment.",
        type: "workshop",
        organizer: "Career Services",
        location: "Main Block Lawn",
        buildingId: buildingMap.MAIN,
        startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        maxAttendees: 500,
        requiresRegistration: true,
      },
      {
        title: "Cricket Tournament - Inter-Department",
        description: "Annual inter-department cricket tournament.",
        type: "sports",
        organizer: "Sports Society",
        location: "Sports Ground",
        buildingId: buildingMap.SPORTS,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAttendees: 200,
      },
    ]);
  }

  const existingAnnouncements = await db.select({ id: schema.announcements.id }).from(schema.announcements).limit(1);
  if (existingAnnouncements.length === 0 && adminUser) {
    await db.insert(schema.announcements).values([
      { title: "Mid-Term Examinations Schedule Released", content: "The schedule for Fall 2025 mid-term examinations has been released. Please check your respective department notice boards and the LMS for detailed timetables.", audience: "all", authorUserId: adminUser.id, isPinned: true },
      { title: "Library Extended Hours During Exams", content: "The central library will remain open until 10 PM during the mid-term examination period to support students.", audience: "student", authorUserId: adminUser.id },
      { title: "Faculty Development Workshop", content: "A faculty development workshop on outcome-based education will be held next week. All faculty members are encouraged to attend.", audience: "faculty", authorUserId: adminUser.id },
    ]);
  }

  // 10. Knowledge Base Documents
  const existingDocs = await db.select({ id: schema.knowledgeDocuments.id }).from(schema.knowledgeDocuments).limit(1);
  if (existingDocs.length === 0) {
    await db.insert(schema.knowledgeDocuments).values([
      {
        title: "Air University Karachi - About the Campus",
        category: "general",
        content: "Air University Karachi Campus is a constituent unit of Air University Islamabad, a federally chartered university established by the Pakistan Air Force. The Karachi campus offers undergraduate programs in Computing & AI, Management, and Social Sciences. The campus is committed to academic excellence, research, and producing graduates who contribute to national development.",
        source: "https://khi.au.edu.pk/",
      },
      {
        title: "Vision & Mission",
        category: "general",
        content: "Vision: To be a leading university recognized for excellence in education, research and innovation. Mission: To provide quality education and foster an environment of learning, research and innovation to produce competent professionals and responsible citizens.",
        source: "https://khi.au.edu.pk/Pages/About/Vision_Mission.aspx",
      },
      {
        title: "Programs Offered - Faculty of Computing & AI",
        category: "academics",
        content: "The Faculty of Computing & AI at Air University Karachi offers: BS Computer Science, BS Artificial Intelligence, BS Data Science, and BS Cyber Security. All programs are 4-year, 8-semester degree programs designed with modern curricula aligned with industry needs.",
        source: "https://khi.au.edu.pk/",
      },
      {
        title: "Programs Offered - AUSOM (Management)",
        category: "academics",
        content: "Air University School of Management (AUSOM) offers: BBA, BS FinTech, BS Accounting & Finance, and BS Aviation Management. These programs combine business fundamentals with modern technology and industry-specific knowledge.",
        source: "https://khi.au.edu.pk/",
      },
      {
        title: "Programs Offered - Faculty of Social Sciences",
        category: "academics",
        content: "The Faculty of Social Sciences at Air University Karachi Campus offers 4-year, 8-semester undergraduate degree programs in BS English and BS Psychology, focusing on critical thinking, communication, behavioral sciences, and research methodology.",
        source: "https://khi.au.edu.pk/",
      },
      {
        title: "How to Register a Complaint",
        category: "guide",
        content: "To register a complaint on AIR CAMPUS X: 1) Login with your credentials. 2) Navigate to 'Complaints' from the sidebar. 3) Click 'New Complaint'. 4) Select the category (WiFi, Classroom, Lab, etc.). 5) Provide a clear title and detailed description. 6) Select the building and location. 7) Optionally attach images. 8) Submit. You will receive a tracking ID (e.g. AUK-12345) to monitor progress.",
      },
      {
        title: "Academic Calendar - Fall 2025",
        category: "academics",
        content: "Fall 2025 semester begins in September. Mid-term examinations typically occur in late October. Final examinations are held in January. The detailed academic calendar with all important dates is published on the official website and LMS.",
        source: "https://khi.au.edu.pk/Pages/About/au_lms.aspx",
      },
      {
        title: "Air University LMS & Academic Procedures",
        category: "academics",
        content: "Air University Learning Management System (AU LMS) is used for course registration, lecture slides, assignments, quizzes, attendance tracking, and official course announcements. Students register for semester courses through their department advisor and LMS portal at the start of each semester.",
        source: "https://khi.au.edu.pk/Pages/About/au_lms.aspx",
      },
      {
        title: "Library Services & Resources",
        category: "facility",
        content: "The Central Library provides access to physical books, e-journals, digital databases, quiet study areas, and group study rooms. Library hours are 8 AM to 6 PM on weekdays, extended to 10 PM during examination periods. Students can borrow up to 4 books at a time with their student ID.",
      },
      {
        title: "Student Societies",
        category: "student_life",
        content: "Air University Karachi has active student societies including: Computing Society, AI & Data Science Society, Literary Society, Sports Society, Debating Society, and Dramatic Society. Students are encouraged to join societies to develop soft skills and network with peers.",
      },
      {
        title: "Admissions Process",
        category: "admissions",
        content: "Admissions to Air University Karachi are merit-based. Applicants must meet the minimum eligibility criteria for their chosen program, appear in the entry test (where applicable), and attend an interview if shortlisted. Admission announcements are published on the official website.",
        source: "https://khi.au.edu.pk/",
      },
      {
        title: "Campus Facilities Overview",
        category: "facility",
        content: "Air University Karachi campus includes: modern classrooms with multimedia, specialized computer labs, a central library, cafeteria, sports complex, auditorium, administrative offices, prayer rooms, and medical facility. All buildings are equipped with WiFi and air conditioning.",
      },
      {
        title: "3D Campus Digital Twin & Building Guide",
        category: "guide",
        content: "Use the Campus Map module in AIR CAMPUS X to explore the interactive 3D campus digital twin. Key campus blocks include Main Academic Block (lecture halls, Dean's office, exam cell), Computing & AI Block (CS Lab A, CS Lab B, AI Research Lab, Cybersecurity Lab), Central Library, Administration Building (Admissions, Accounts, Student Affairs), Cafeteria & Student Center, Sports Complex, and Auditorium.",
      },
      {
        title: "IT, Wi-Fi & Laboratory Support",
        category: "facility",
        content: "Campus-wide Wi-Fi and specialized laboratories (Programming Lab, Networks Lab, AI Research Lab, Cybersecurity Lab) are maintained by the IT & Computing support team. If you experience Wi-Fi connectivity issues, missing lab software, or hardware faults, submit a complaint under 'Wi-Fi & Internet' or 'Laboratory' with the building and lab name.",
      },
      {
        title: "Student Affairs, Events & Lost and Found",
        category: "student_life",
        content: "The Student Affairs Office located in the Administration Building Floor 1 assists with student ID cards, society registrations, campus events, scholarships/financial aid inquiries, and Lost & Found items. You can also view upcoming seminars, workshops, and sports events in the Events module.",
      },
    ]);
  }

  // 11. Notifications & System Settings
  const existingNotifs = await db.select({ id: schema.notifications.id }).from(schema.notifications).limit(1);
  if (existingNotifs.length === 0 && studentUser && facultyUser && adminUser) {
    await db.insert(schema.notifications).values([
      { userId: studentUser.id, type: "complaint", title: "Complaint Resolved", message: "Your complaint 'WiFi not working in CS Lab A' has been resolved.", link: "/student/complaints" },
      { userId: studentUser.id, type: "academic", title: "New Assignment Posted", message: "New assignment in Data Structures & Algorithms is due in 7 days.", link: "/student/academics" },
      { userId: studentUser.id, type: "event", title: "AI Research Symposium", message: "Registration is now open for the AI Research Symposium 2025.", link: "/student/events" },
      { userId: facultyUser.id, type: "info", title: "Welcome to Fall 2025", message: "Your course roster is now available.", link: "/faculty/courses" },
      { userId: adminUser.id, type: "complaint", title: "New Complaint Assigned", message: "A new complaint has been assigned to your department.", link: "/admin/complaints" },
    ]);
  }

  await db
    .insert(schema.systemSettings)
    .values([
      { key: "platform.name", value: "AIR CAMPUS X", description: "Platform display name" },
      { key: "platform.tagline", value: "One Campus. One Intelligence. Infinite Possibilities.", description: "Platform tagline" },
      { key: "platform.version", value: "1.0.0-demo", description: "Current platform version" },
      { key: "ai.enabled", value: true, description: "AI features enabled" },
      { key: "ai.openrouter_enabled", value: true, description: "OpenRouter SDK enabled" },
      { key: "ai.google_api_enabled", value: true, description: "Google Gemini API enabled" },
      { key: "ai.provider", value: "openrouter", description: "Preferred AI provider" },
      { key: "ai.model", value: "google/gemini-2.5-flash", description: "Active AI model identifier" },
      { key: "features.complaints", value: true, description: "Complaints module enabled" },
      { key: "features.events", value: true, description: "Events module enabled" },
      { key: "features.3d_map", value: true, description: "3D campus map enabled" },
      { key: "features.ai_assistant", value: true, description: "AI assistant enabled" },
    ])
    .onConflictDoNothing();

  if (superAdminUser) {
    const existingAudit = await db.select({ id: schema.auditLogs.id }).from(schema.auditLogs).limit(1);
    if (existingAudit.length === 0) {
      await db.insert(schema.auditLogs).values({
        userId: superAdminUser.id,
        action: "system.auto_bootstrap",
        entityType: "system",
        metadata: { message: "Database schema and demo accounts automatically bootstrapped" },
      });
    }
  }
}

async function runBootstrapWithLock(): Promise<void> {
  // Fast check before acquiring lock if tables & demo users already exist
  try {
    const check = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM public.users) AS users_count,
        (SELECT count(*)::int FROM public.student_profiles) AS students_count,
        (SELECT count(*)::int FROM public.faculty_profiles) AS faculty_count,
        (SELECT count(*)::int FROM public.admin_profiles) AS admins_count
    `);
    const row = check.rows?.[0];
    if (
      row &&
      row.users_count >= 4 &&
      row.students_count >= 1 &&
      row.faculty_count >= 1 &&
      row.admins_count >= 1
    ) {
      globalBootstrap.__airCampusDbReady = true;
      return;
    }
  } catch {
    // Tables do not exist yet; proceed with advisory-locked DDL + seed
  }

  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(88442211)");
    try {
      await client.query(SCHEMA_DDL);
    } finally {
      await client.query("SELECT pg_advisory_unlock(88442211)").catch(() => {});
    }
  } finally {
    client.release();
  }

  // Ensure demo users, profiles, courses, buildings, and knowledge base exist
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.users);

  const [{ spCount }] = await db
    .select({ spCount: sql<number>`count(*)::int` })
    .from(schema.studentProfiles);

  if (!count || count < 4 || !spCount) {
    await seedInitialCampusData();
  }

  globalBootstrap.__airCampusDbReady = true;
}

export async function ensureDatabaseReady(forceRecheck = false): Promise<void> {
  if (forceRecheck) {
    globalBootstrap.__airCampusDbReady = false;
    globalBootstrap.__airCampusDbBootstrapPromise = null;
  }

  if (globalBootstrap.__airCampusDbReady) {
    return;
  }

  if (!globalBootstrap.__airCampusDbBootstrapPromise) {
    globalBootstrap.__airCampusDbBootstrapPromise = runBootstrapWithLock().finally(() => {
      globalBootstrap.__airCampusDbBootstrapPromise = null;
    });
  }

  await globalBootstrap.__airCampusDbBootstrapPromise;
}
