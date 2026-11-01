import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="faculty" title="Announcements">
      <ComingSoon
        title="Announcements"
        description="Post and manage academic announcements."
        icon={<FileText className="h-7 w-7" />}
        backHref="/faculty"
        backLabel="Back to dashboard"
        features={["Create announcements","Target audience","Pin important","View history"]}
      />
    </DashboardShell>
  );
}
