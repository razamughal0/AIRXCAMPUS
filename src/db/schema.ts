import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  unique,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";

// ============== ENUMS ==============
export const roleEnum = pgEnum("user_role", [
  "student",
  "faculty",
  "admin",
  "super_admin",
]);

export const complaintStatusEnum = pgEnum("complaint_status", [
  "submitted",
  "under_review",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
  "rejected",
]);

export const complaintPriorityEnum = pgEnum("complaint_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const complaintCategoryEnum = pgEnum("complaint_category", [
  "wifi_internet",
  "classroom",
  "laboratory",
  "electricity",
  "washroom",
  "cleanliness",
  "transport",
  "library",
  "cafeteria",
  "security",
  "other",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "academic",
  "cultural",
  "sports",
  "seminar",
  "workshop",
  "society",
  "other",
]);

export const lostFoundStatusEnum = pgEnum("lost_found_status", [
  "lost",
  "found",
  "claimed",
  "closed",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "info",
  "success",
  "warning",
  "alert",
  "complaint",
  "academic",
  "event",
]);

// ============== CORE TABLES ==============
export const departments = pgTable(
  "departments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar({ length: 20 }).notNull().unique(),
    name: varchar({ length: 200 }).notNull(),
    faculty: varchar({ length: 200 }).notNull(), // e.g. "Faculty of Computing & AI"
    description: text(),
    headName: varchar({ length: 200 }),
    contactEmail: varchar({ length: 200 }),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: index("departments_code_idx").on(t.code),
  })
);

export const programs = pgTable(
  "programs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar({ length: 20 }).notNull().unique(),
    name: varchar({ length: 200 }).notNull(),
    level: varchar({ length: 50 }).notNull(), // BS, MS, PhD
    durationYears: integer().notNull(),
    totalSemesters: integer().notNull(),
    departmentId: integer()
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    description: text(),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deptIdx: index("programs_department_idx").on(t.departmentId),
  })
);

export const buildings = pgTable("buildings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  code: varchar({ length: 20 }).notNull().unique(),
  name: varchar({ length: 200 }).notNull(),
  shortName: varchar({ length: 50 }),
  description: text(),
  floors: integer().notNull().default(1),
  // 3D map coordinates (normalized 0-100 grid for conceptual model)
  posX: real().notNull().default(0),
  posZ: real().notNull().default(0),
  width: real().notNull().default(10),
  depth: real().notNull().default(10),
  height: real().notNull().default(8),
  color: varchar({ length: 20 }).notNull().default("#3b82f6"),
  facilities: jsonb().$type<string[]>().default([]),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const campusLocations = pgTable(
  "campus_locations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    buildingId: integer()
      .notNull()
      .references(() => buildings.id, { onDelete: "cascade" }),
    name: varchar({ length: 200 }).notNull(), // e.g. "Room 201", "CS Lab A"
    type: varchar({ length: 50 }).notNull(), // classroom, lab, office, cafeteria, library, washroom
    floor: integer().notNull().default(1),
    capacity: integer(),
    facilities: jsonb().$type<string[]>().default([]),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    buildingIdx: index("locations_building_idx").on(t.buildingId),
    typeIdx: index("locations_type_idx").on(t.type),
  })
);

// ============== USERS & AUTH ==============
export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: varchar({ length: 200 }).notNull().unique(),
    username: varchar({ length: 100 }).unique(),
    passwordHash: varchar({ length: 255 }).notNull(),
    role: roleEnum().notNull(),
    fullName: varchar({ length: 200 }).notNull(),
    avatarUrl: varchar({ length: 500 }),
    phone: varchar({ length: 50 }),
    isActive: boolean().notNull().default(true),
    isVerified: boolean().notNull().default(true),
    lastLoginAt: timestamp({ withTimezone: true }),
    mfaEnabled: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
  })
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    studentId: varchar({ length: 50 }).notNull().unique(), // e.g. "210401001"
    programId: integer().references(() => programs.id),
    currentSemester: integer().notNull().default(1),
    cgpa: real(),
    enrollmentYear: integer().notNull(),
    guardianName: varchar({ length: 200 }),
    guardianPhone: varchar({ length: 50 }),
    address: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studentIdIdx: index("student_profiles_student_id_idx").on(t.studentId),
    programIdx: index("student_profiles_program_idx").on(t.programId),
  })
);

export const facultyProfiles = pgTable(
  "faculty_profiles",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    employeeId: varchar({ length: 50 }).notNull().unique(),
    departmentId: integer().references(() => departments.id),
    designation: varchar({ length: 100 }).notNull(), // Lecturer, Assistant Prof, etc.
    specialization: varchar({ length: 300 }),
    officeRoom: varchar({ length: 100 }),
    qualification: varchar({ length: 300 }),
    joiningYear: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deptIdx: index("faculty_profiles_dept_idx").on(t.departmentId),
  })
);

export const adminProfiles = pgTable(
  "admin_profiles",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    employeeId: varchar({ length: 50 }).notNull().unique(),
    departmentId: integer().references(() => departments.id),
    designation: varchar({ length: 100 }).notNull(),
    scope: varchar({ length: 100 }).notNull().default("department"), // department, campus, global
    permissions: jsonb().$type<string[]>().default([]),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  }
);

// ============== ACADEMICS ==============
export const courses = pgTable(
  "courses",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    code: varchar({ length: 20 }).notNull().unique(),
    name: varchar({ length: 200 }).notNull(),
    creditHours: integer().notNull(),
    departmentId: integer().references(() => departments.id),
    description: text(),
    semester: integer(),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeIdx: index("courses_code_idx").on(t.code),
  })
);

export const courseSections = pgTable(
  "course_sections",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    courseId: integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    sectionCode: varchar({ length: 10 }).notNull(), // A, B, C
    facultyUserId: integer().references(() => users.id),
    semester: varchar({ length: 20 }).notNull(), // e.g. "Fall 2025"
    year: integer().notNull(),
    scheduleJson: jsonb(), // { days: [...], startTime, endTime, room }
    maxCapacity: integer().notNull().default(40),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    courseIdx: index("sections_course_idx").on(t.courseId),
    facultyIdx: index("sections_faculty_idx").on(t.facultyUserId),
    uniqueSection: unique("unique_course_section_semester").on(
      t.courseId,
      t.sectionCode,
      t.semester,
      t.year
    ),
  })
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    studentUserId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sectionId: integer()
      .notNull()
      .references(() => courseSections.id, { onDelete: "cascade" }),
    status: varchar({ length: 30 }).notNull().default("active"),
    enrolledAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueEnrollment: unique("unique_student_section").on(
      t.studentUserId,
      t.sectionId
    ),
    studentIdx: index("enrollments_student_idx").on(t.studentUserId),
  })
);

export const assignments = pgTable(
  "assignments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    sectionId: integer()
      .notNull()
      .references(() => courseSections.id, { onDelete: "cascade" }),
    title: varchar({ length: 200 }).notNull(),
    description: text(),
    totalMarks: integer().notNull().default(100),
    dueDate: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  }
);

export const announcements = pgTable("announcements", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 200 }).notNull(),
  content: text().notNull(),
  audience: varchar({ length: 50 }).notNull().default("all"), // all, student, faculty
  departmentId: integer().references(() => departments.id),
  authorUserId: integer().references(() => users.id),
  isPinned: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============== COMPLAINTS ==============
export const complaints = pgTable(
  "complaints",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    trackingId: varchar({ length: 20 }).notNull().unique(),
    submitterUserId: integer()
      .notNull()
      .references(() => users.id),
    category: complaintCategoryEnum().notNull(),
    title: varchar({ length: 200 }).notNull(),
    description: text().notNull(),
    buildingId: integer().references(() => buildings.id),
    locationId: integer().references(() => campusLocations.id),
    roomDescription: varchar({ length: 200 }),
    priority: complaintPriorityEnum().notNull().default("medium"),
    status: complaintStatusEnum().notNull().default("submitted"),
    assignedDepartmentId: integer().references(() => departments.id),
    assignedToUserId: integer().references(() => users.id),
    aiClassification: jsonb(), // { confidence, keywords, similarIds }
    attachmentUrls: jsonb().$type<string[]>().default([]),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trackingIdx: index("complaints_tracking_idx").on(t.trackingId),
    submitterIdx: index("complaints_submitter_idx").on(t.submitterUserId),
    statusIdx: index("complaints_status_idx").on(t.status),
    categoryIdx: index("complaints_category_idx").on(t.category),
  })
);

export const complaintUpdates = pgTable("complaint_updates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  complaintId: integer()
    .notNull()
    .references(() => complaints.id, { onDelete: "cascade" }),
  authorUserId: integer().references(() => users.id),
  message: text().notNull(),
  statusChange: complaintStatusEnum(),
  isInternal: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============== EVENTS & LOST/FOUND ==============
export const events = pgTable("events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 200 }).notNull(),
  description: text(),
  type: eventTypeEnum().notNull().default("academic"),
  organizer: varchar({ length: 200 }),
  location: varchar({ length: 200 }),
  buildingId: integer().references(() => buildings.id),
  startDate: timestamp({ withTimezone: true }).notNull(),
  endDate: timestamp({ withTimezone: true }),
  maxAttendees: integer(),
  requiresRegistration: boolean().notNull().default(false),
  imageUrl: varchar({ length: 500 }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    eventId: integer()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    registeredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueReg: unique("unique_event_user").on(t.eventId, t.userId),
  })
);

export const lostFoundItems = pgTable("lost_found_items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  reporterUserId: integer()
    .notNull()
    .references(() => users.id),
  type: lostFoundStatusEnum().notNull(), // lost or found
  title: varchar({ length: 200 }).notNull(),
  description: text().notNull(),
  location: varchar({ length: 200 }),
  buildingId: integer().references(() => buildings.id),
  reportedDate: timestamp({ withTimezone: true }).notNull(),
  contactMethod: varchar({ length: 200 }),
  status: varchar({ length: 30 }).notNull().default("open"),
  imageUrl: varchar({ length: 500 }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============== NOTIFICATIONS ==============
export const notifications = pgTable(
  "notifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum().notNull().default("info"),
    title: varchar({ length: 200 }).notNull(),
    message: text().notNull(),
    link: varchar({ length: 500 }),
    isRead: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
    unreadIdx: index("notifications_unread_idx").on(t.userId, t.isRead),
  })
);

// ============== FEEDBACK ==============
export const feedback = pgTable("feedback", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().references(() => users.id),
  category: varchar({ length: 50 }).notNull(), // suggestion, bug, praise, idea
  title: varchar({ length: 200 }).notNull(),
  message: text().notNull(),
  isAnonymous: boolean().notNull().default(false),
  status: varchar({ length: 30 }).notNull().default("new"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============== AI & KNOWLEDGE BASE ==============
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar({ length: 300 }).notNull(),
  category: varchar({ length: 100 }).notNull(), // policy, guide, handbook, announcement
  content: text().notNull(),
  source: varchar({ length: 500 }),
  uploadedByUserId: integer().references(() => users.id),
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const aiInteractions = pgTable("ai_interactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer().references(() => users.id),
  module: varchar({ length: 50 }).notNull(), // assistant, complaint_classify, report
  prompt: text().notNull(),
  response: text().notNull(),
  sources: jsonb().$type<{ docId: number; title: string; snippet: string }[]>(),
  tokensUsed: integer(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ============== AUDIT & SYSTEM ==============
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer().references(() => users.id),
    action: varchar({ length: 100 }).notNull(),
    entityType: varchar({ length: 100 }).notNull(),
    entityId: integer(),
    metadata: jsonb(),
    ipAddress: varchar({ length: 100 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actionIdx: index("audit_action_idx").on(t.action),
    userIdx: index("audit_user_idx").on(t.userId),
    createdAtIdx: index("audit_created_idx").on(t.createdAt),
  })
);

export const systemSettings = pgTable(
  "system_settings",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    key: varchar({ length: 100 }).notNull().unique(),
    value: jsonb().notNull(),
    description: text(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  }
);

export const roomBookings = pgTable("room_bookings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  locationId: integer()
    .notNull()
    .references(() => campusLocations.id, { onDelete: "cascade" }),
  bookedByUserId: integer()
    .notNull()
    .references(() => users.id),
  title: varchar({ length: 200 }).notNull(),
  startTime: timestamp({ withTimezone: true }).notNull(),
  endTime: timestamp({ withTimezone: true }).notNull(),
  status: varchar({ length: 30 }).notNull().default("approved"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
