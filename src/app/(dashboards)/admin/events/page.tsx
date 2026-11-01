import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="admin" title="Event Management">
      <ComingSoon
        title="Event Management"
        description="Organize and manage campus events."
        icon={<Calendar className="h-7 w-7" />}
        backHref="/admin"
        backLabel="Back to dashboard"
        features={["Create events","Manage registrations","Send invites","Attendance tracking"]}
      />
    </DashboardShell>
  );
}
