import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginClient } from "@/components/login-client";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const s = await getSession();
  if (s?.role === "admin") redirect("/admin");

  return (
    <LoginClient
      role="admin"
      title="Administration Portal"
      subtitle="Manage complaints, departments, facilities and campus operations. Gain insights through real-time analytics and reports."
      accent="from-emerald-600 via-emerald-800 to-navy-800"
      demoAccounts={[
        { email: "admin@aircampus.demo", password: "Admin@123", label: "Dr. Ayesha Khan · CS Coordinator" },
        { email: "admin2@aircampus.demo", password: "Admin@123", label: "Mr. Bilal Ahmed · Facilities Manager" },
      ]}
    />
  );
}
