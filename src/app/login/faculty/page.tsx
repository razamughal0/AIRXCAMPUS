import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginClient } from "@/components/login-client";

export const dynamic = "force-dynamic";

export default async function FacultyLoginPage() {
  const s = await getSession();
  if (s?.role === "faculty") redirect("/faculty");

  return (
    <LoginClient
      role="faculty"
      title="Faculty Portal"
      subtitle="Manage your courses, assignments and students. Leverage the AI Teaching Assistant to prepare lectures, quizzes and lesson plans."
      accent="from-cyan-600 via-cyan-800 to-navy-800"
      demoAccounts={[
        { email: "faculty@aircampus.demo", password: "Faculty@123", label: "Dr. Ahmed Ali · CS Department" },
        { email: "faculty2@aircampus.demo", password: "Faculty@123", label: "Dr. Fatima Zahra · AI Department" },
      ]}
    />
  );
}
