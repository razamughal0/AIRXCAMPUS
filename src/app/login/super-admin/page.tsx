import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginClient } from "@/components/login-client";

export const dynamic = "force-dynamic";

export default async function SuperAdminLoginPage() {
  const s = await getSession();
  if (s?.role === "super_admin") redirect("/super-admin");

  return (
    <LoginClient
      role="super_admin"
      title="Super Admin Console"
      subtitle="Platform configuration, user management, audit logs and system health monitoring. Highest-privilege access only."
      accent="from-amber-600 via-amber-800 to-navy-900"
      demoAccounts={[
        { email: "superadmin@aircampus.demo", password: "Super@123", label: "Platform Super Admin" },
      ]}
    />
  );
}
