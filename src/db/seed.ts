// Seed script for AIR CAMPUS X demo data
// Run: npx tsx src/db/seed.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  console.log("🌱 Seeding AIR CAMPUS X database...");

  // Clear existing data in correct order
  const tables = [
    schema.eventRegistrations,
    schema.events,
    schema.complaintUpdates,
    schema.complaints,
    schema.enrollments,
    schema.assignments,
    schema.courseSections,
    schema.courses,
    schema.announcements,
    schema.notifications,
    schema.feedback,
    schema.lostFoundItems,
    schema.knowledgeDocuments,
    schema.aiInteractions,
    schema.auditLogs,
    schema.roomBookings,
    schema.campusLocations,
    schema.buildings,
    schema.programs,
    schema.departments,
    schema.studentProfiles,
    schema.facultyProfiles,
    schema.adminProfiles,
    schema.users,
    schema.systemSettings,
  ];
  for (const t of tables) {
    await db.delete(t);
  }

  // Reset identity sequences
  await db.execute(sql`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      LOOP
        EXECUTE 'ALTER SEQUENCE IF EXISTS ' || r.tablename || '_id_seq RESTART WITH 1';
      END LOOP;
    END $$;
  `);

  // ===== DEPARTMENTS =====
  const [csDept] = await db
    .insert(schema.departments)
    .values([
      {
        code: "CS",
        name: "Department of Computer Science",
        faculty: "Faculty of Computing & AI",
        description:
          "Offers BS Computer Science with emphasis on software engineering, algorithms, and systems.",
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
    .returning();

  const deptMap: Record<string, number> = {};
  const allDepts = await db.select().from(schema.departments);
  allDepts.forEach((d) => (deptMap[d.code] = d.id));

  // ===== PROGRAMS =====
  await db.insert(schema.programs).values([
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
  ]);

  // ===== BUILDINGS (conceptual demo campus layout) =====
  const buildingsData = [
    { code: "MAIN", name: "Main Academic Block", shortName: "Main Block", posX: 50, posZ: 30, width: 22, depth: 14, height: 12, color: "#2563eb", floors: 3, description: "Primary academic building housing classrooms, faculty offices, and administrative departments.", facilities: ["Classrooms", "Faculty Offices", "Dean's Office", "Exam Cell"] },
    { code: "CS-BLOCK", name: "Computing & AI Block", shortName: "CS Block", posX: 25, posZ: 50, width: 18, depth: 14, height: 10, color: "#0891b2", floors: 3, description: "Dedicated block for Computing and AI departments with modern computer labs.", facilities: ["Computer Labs", "AI Research Lab", "Cybersecurity Lab", "Seminar Hall"] },
    { code: "LIB", name: "Central Library", shortName: "Library", posX: 75, posZ: 50, width: 16, depth: 14, height: 9, color: "#7c3aed", floors: 2, description: "University library with digital and physical collections.", facilities: ["Reading Hall", "Digital Resources", "Study Rooms", "E-Journals"] },
    { code: "ADMIN", name: "Administration Building", shortName: "Admin", posX: 50, posZ: 70, width: 16, depth: 10, height: 8, color: "#059669", floors: 2, description: "Administrative offices including admissions, accounts, and student affairs.", facilities: ["Admissions", "Accounts", "Student Affairs", "VC Office"] },
    { code: "CAF", name: "Cafeteria & Student Center", shortName: "Cafeteria", posX: 20, posZ: 25, width: 14, depth: 10, height: 6, color: "#ea580c", floors: 1, description: "Campus cafeteria and student activity center.", facilities: ["Food Court", "Student Lounge", "Society Rooms"] },
    { code: "SPORTS", name: "Sports Complex", shortName: "Sports", posX: 82, posZ: 25, width: 16, depth: 12, height: 7, color: "#dc2626", floors: 1, description: "Indoor and outdoor sports facilities.", facilities: ["Gymnasium", "Indoor Court", "Changing Rooms"] },
    { code: "AUD", name: "Auditorium", shortName: "Auditorium", posX: 50, posZ: 10, width: 18, depth: 10, height: 10, color: "#b45309", floors: 1, description: "Main auditorium for events, seminars, and ceremonies.", facilities: ["Main Hall", "Stage", "AV Room"] },
  ];

  await db.insert(schema.buildings).values(buildingsData);

  const allBuildings = await db.select().from(schema.buildings);
  const buildingMap: Record<string, number> = {};
  allBuildings.forEach((b) => (buildingMap[b.code] = b.id));

  // ===== CAMPUS LOCATIONS =====
  const locations = [
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
  ];
  await db.insert(schema.campusLocations).values(locations);

  // ===== USERS =====
  const superAdminHash = await hash("Super@123");
  const adminHash = await hash("Admin@123");
  const facultyHash = await hash("Faculty@123");
  const studentHash = await hash("Student@123");

  const [superAdminUser] = await db
    .insert(schema.users)
    .values({
      email: "superadmin@aircampus.demo",
      username: "superadmin",
      passwordHash: superAdminHash,
      role: "super_admin",
      fullName: "Platform Super Admin",
    })
    .returning();

  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email: "admin@aircampus.demo",
      username: "admin.cs",
      passwordHash: adminHash,
      role: "admin",
      fullName: "Dr. Ayesha Khan",
    })
    .returning();

  const [facultyUser] = await db
    .insert(schema.users)
    .values({
      email: "faculty@aircampus.demo",
      username: "faculty.ali",
      passwordHash: facultyHash,
      role: "faculty",
      fullName: "Dr. Ahmed Ali",
    })
    .returning();

  const [studentUser] = await db
    .insert(schema.users)
    .values({
      email: "student@aircampus.demo",
      username: "210401001",
      passwordHash: studentHash,
      role: "student",
      fullName: "Sara Malik",
    })
    .returning();

  // Additional demo users
  const [facultyUser2] = await db
    .insert(schema.users)
    .values({
      email: "faculty2@aircampus.demo",
      username: "faculty.fatima",
      passwordHash: facultyHash,
      role: "faculty",
      fullName: "Dr. Fatima Zahra",
    })
    .returning();

  const [studentUser2] = await db
    .insert(schema.users)
    .values({
      email: "student2@aircampus.demo",
      username: "210401002",
      passwordHash: studentHash,
      role: "student",
      fullName: "Hassan Raza",
    })
    .returning();

  const [adminUser2] = await db
    .insert(schema.users)
    .values({
      email: "admin2@aircampus.demo",
      username: "admin.facilities",
      passwordHash: adminHash,
      role: "admin",
      fullName: "Mr. Bilal Ahmed",
    })
    .returning();

  // ===== PROFILES =====
  await db.insert(schema.adminProfiles).values([
    { userId: adminUser.id, employeeId: "ADM-001", departmentId: deptMap.CS, designation: "Department Coordinator", scope: "department", permissions: ["complaints.manage", "faculty.view", "students.view", "announcements.manage"] },
    { userId: adminUser2.id, employeeId: "ADM-002", departmentId: deptMap.ADMIN, designation: "Facilities Manager", scope: "campus", permissions: ["complaints.manage", "facilities.manage", "maintenance.manage"] },
  ]);

  await db.insert(schema.facultyProfiles).values([
    { userId: facultyUser.id, employeeId: "FAC-001", departmentId: deptMap.CS, designation: "Assistant Professor", specialization: "Machine Learning & AI", officeRoom: "Main Block Room 210", qualification: "PhD Computer Science", joiningYear: 2018 },
    { userId: facultyUser2.id, employeeId: "FAC-002", departmentId: deptMap.AI, designation: "Lecturer", specialization: "Natural Language Processing", officeRoom: "CS Block Room 205", qualification: "MS Artificial Intelligence", joiningYear: 2021 },
  ]);

  const programsAll = await db.select().from(schema.programs);
  const bsCs = programsAll.find((p) => p.code === "BS-CS")!;

  await db.insert(schema.studentProfiles).values([
    { userId: studentUser.id, studentId: "210401001", programId: bsCs.id, currentSemester: 5, cgpa: 3.62, enrollmentYear: 2021 },
    { userId: studentUser2.id, studentId: "210401002", programId: bsCs.id, currentSemester: 5, cgpa: 3.45, enrollmentYear: 2021 },
  ]);

  // ===== COURSES & SECTIONS =====
  const coursesData = [
    { code: "CS-301", name: "Data Structures & Algorithms", creditHours: 3, departmentId: deptMap.CS, semester: 5 },
    { code: "CS-305", name: "Database Systems", creditHours: 3, departmentId: deptMap.CS, semester: 5 },
    { code: "AI-301", name: "Introduction to Machine Learning", creditHours: 3, departmentId: deptMap.AI, semester: 5 },
    { code: "CS-310", name: "Software Engineering", creditHours: 3, departmentId: deptMap.CS, semester: 5 },
    { code: "CS-201", name: "Object Oriented Programming", creditHours: 3, departmentId: deptMap.CS, semester: 3 },
  ];
  await db.insert(schema.courses).values(coursesData);

  const allCourses = await db.select().from(schema.courses);
  const dsa = allCourses.find((c) => c.code === "CS-301")!;
  const dbCourse = allCourses.find((c) => c.code === "CS-305")!;
  const ml = allCourses.find((c) => c.code === "AI-301")!;
  const se = allCourses.find((c) => c.code === "CS-310")!;

  await db.insert(schema.courseSections).values([
    { courseId: dsa.id, sectionCode: "A", facultyUserId: facultyUser.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Mon", "Wed"], startTime: "09:00", endTime: "10:30", room: "Main Block 101" }, maxCapacity: 40 },
    { courseId: dbCourse.id, sectionCode: "A", facultyUserId: facultyUser.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Tue", "Thu"], startTime: "11:00", endTime: "12:30", room: "CS Lab A" }, maxCapacity: 40 },
    { courseId: ml.id, sectionCode: "A", facultyUserId: facultyUser2.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Mon", "Fri"], startTime: "14:00", endTime: "15:30", room: "AI Research Lab" }, maxCapacity: 35 },
    { courseId: se.id, sectionCode: "A", facultyUserId: facultyUser.id, semester: "Fall", year: 2025, scheduleJson: { days: ["Wed", "Fri"], startTime: "09:00", endTime: "10:30", room: "Main Block 201" }, maxCapacity: 40 },
  ]);

  const allSections = await db.select().from(schema.courseSections);

  // Enroll both students in all sections
  for (const section of allSections) {
    await db.insert(schema.enrollments).values([
      { studentUserId: studentUser.id, sectionId: section.id },
      { studentUserId: studentUser2.id, sectionId: section.id },
    ]);
  }

  // Assignments
  await db.insert(schema.assignments).values([
    { sectionId: allSections[0].id, title: "Assignment 1: Binary Search Trees", description: "Implement AVL tree with insertion, deletion and balancing.", totalMarks: 50, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { sectionId: allSections[1].id, title: "Lab 2: SQL Joins & Normalization", description: "Complete the provided SQL exercises on PostgreSQL.", totalMarks: 30, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { sectionId: allSections[2].id, title: "Project Proposal: ML Application", description: "Submit a 2-page proposal for your ML project.", totalMarks: 20, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  ]);

  // ===== COMPLAINTS (demo data for analytics) =====
  const now = Date.now();
  const demoComplaints = [
    { submitterUserId: studentUser.id, category: "wifi_internet" as const, title: "WiFi not working in CS Lab A", description: "Internet has been down since morning in CS Lab A. Unable to work on lab tasks.", buildingId: buildingMap["CS-BLOCK"], status: "resolved" as const, priority: "high" as const, assignedDepartmentId: deptMap.CS, daysAgo: 14 },
    { submitterUserId: studentUser.id, category: "electricity" as const, title: "Power fluctuation in Main Block", description: "Frequent power outages in Main Block classrooms during afternoon classes.", buildingId: buildingMap.MAIN, status: "in_progress" as const, priority: "high" as const, assignedDepartmentId: deptMap.ADMIN, daysAgo: 3 },
    { submitterUserId: studentUser2.id, category: "washroom" as const, title: "Washroom water issue", description: "No water in the 2nd floor washroom of Main Block.", buildingId: buildingMap.MAIN, status: "submitted" as const, priority: "medium" as const, daysAgo: 1 },
    { submitterUserId: studentUser.id, category: "cleanliness" as const, title: "Cafeteria tables not cleaned", description: "Tables in cafeteria are not cleaned regularly during lunch hours.", buildingId: buildingMap.CAF, status: "resolved" as const, priority: "low" as const, assignedDepartmentId: deptMap.ADMIN, daysAgo: 20 },
    { submitterUserId: studentUser2.id, category: "laboratory" as const, title: "Software missing in Lab B", description: "Python 3.11 not installed on workstations in CS Lab B.", buildingId: buildingMap["CS-BLOCK"], status: "assigned" as const, priority: "medium" as const, assignedDepartmentId: deptMap.CS, daysAgo: 5 },
    { submitterUserId: studentUser.id, category: "classroom" as const, title: "Projector issue in Room 201", description: "Projector in Main Block Room 201 displaying blurry image.", buildingId: buildingMap.MAIN, status: "resolved" as const, priority: "medium" as const, assignedDepartmentId: deptMap.CS, daysAgo: 30 },
    { submitterUserId: studentUser2.id, category: "library" as const, title: "AC not working in library", description: "Air conditioning in main reading hall not functional for 2 days.", buildingId: buildingMap.LIB, status: "under_review" as const, priority: "medium" as const, daysAgo: 2 },
    { submitterUserId: studentUser.id, category: "security" as const, title: "CCTV camera not working at gate", description: "Main gate CCTV camera has been out of service for a week.", buildingId: buildingMap.ADMIN, status: "submitted" as const, priority: "high" as const, daysAgo: 0 },
  ];

  for (const c of demoComplaints) {
    const daysAgo = c.daysAgo;
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const trackingId = `AUK-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    await db.insert(schema.complaints).values({
      trackingId,
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
    });
  }

  // ===== EVENTS =====
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

  // ===== ANNOUNCEMENTS =====
  await db.insert(schema.announcements).values([
    { title: "Mid-Term Examinations Schedule Released", content: "The schedule for Fall 2025 mid-term examinations has been released. Please check your respective department notice boards and the LMS for detailed timetables.", audience: "all", authorUserId: adminUser.id, isPinned: true },
    { title: "Library Extended Hours During Exams", content: "The central library will remain open until 10 PM during the mid-term examination period to support students.", audience: "student", authorUserId: adminUser.id },
    { title: "Faculty Development Workshop", content: "A faculty development workshop on outcome-based education will be held next week. All faculty members are encouraged to attend.", audience: "faculty", authorUserId: adminUser.id },
  ]);

  // ===== KNOWLEDGE BASE =====
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
      title: "Programs Offered - Faculty of Social Sciences",
      category: "academics",
      content: "The Faculty of Social Sciences at Air University Karachi Campus offers 4-year, 8-semester undergraduate degree programs in BS English and BS Psychology, focusing on critical thinking, communication, behavioral sciences, and research methodology.",
      source: "https://khi.au.edu.pk/",
    },
    {
      title: "Air University LMS & Academic Procedures",
      category: "academics",
      content: "Air University Learning Management System (AU LMS) is used for course registration, lecture slides, assignments, quizzes, attendance tracking, and official course announcements. Students register for semester courses through their department advisor and LMS portal at the start of each semester.",
      source: "https://khi.au.edu.pk/Pages/About/au_lms.aspx",
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

  // ===== NOTIFICATIONS =====
  await db.insert(schema.notifications).values([
    { userId: studentUser.id, type: "complaint", title: "Complaint Resolved", message: "Your complaint 'WiFi not working in CS Lab A' has been resolved.", link: "/student/complaints" },
    { userId: studentUser.id, type: "academic", title: "New Assignment Posted", message: "New assignment in Data Structures & Algorithms is due in 7 days.", link: "/student/academics" },
    { userId: studentUser.id, type: "event", title: "AI Research Symposium", message: "Registration is now open for the AI Research Symposium 2025.", link: "/student/events" },
    { userId: facultyUser.id, type: "info", title: "Welcome to Fall 2025", message: "Your course roster is now available.", link: "/faculty/courses" },
    { userId: adminUser.id, type: "complaint", title: "New Complaint Assigned", message: "A new complaint has been assigned to your department.", link: "/admin/complaints" },
  ]);

  // ===== SYSTEM SETTINGS =====
  await db.insert(schema.systemSettings).values([
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
  ]);

  // ===== AUDIT LOG =====
  await db.insert(schema.auditLogs).values([
    { userId: superAdminUser.id, action: "system.seed", entityType: "system", metadata: { message: "Initial demo data seeded" } },
  ]);

  console.log("✅ Seed complete.");
  console.log("");
  console.log("🔐 Demo Accounts:");
  console.log("   Super Admin : superadmin@aircampus.demo / Super@123");
  console.log("   Admin       : admin@aircampus.demo       / Admin@123");
  console.log("   Admin (Fac.) : admin2@aircampus.demo      / Admin@123");
  console.log("   Faculty     : faculty@aircampus.demo     / Faculty@123");
  console.log("   Faculty 2   : faculty2@aircampus.demo    / Faculty@123");
  console.log("   Student     : student@aircampus.demo     / Student@123");
  console.log("   Student 2   : student2@aircampus.demo    / Student@123");

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
