import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginClient } from "@/components/login-client";

export const dynamic = "force-dynamic";

export default async function StudentLoginPage() {
  const s = await getSession();
  if (s?.role === "student") redirect("/student");

  return (
    <LoginClient
      role="student"
      title="Student Portal"
      subtitle="Your intelligent campus companion. Access courses, file complaints, explore the 3D campus, and chat with the AI assistant."
      accent="from-navy-600 via-navy-800 to-cyan-700"
      demoAccounts={[
        { email: "student@aircampus.demo", password: "Student@123", label: "Sara Malik · BS-CS (Semester 5)" },
        { email: "student2@aircampus.demo", password: "Student@123", label: "Hassan Raza · BS-CS (Semester 5)" },
      ]}
    />
  );
}
