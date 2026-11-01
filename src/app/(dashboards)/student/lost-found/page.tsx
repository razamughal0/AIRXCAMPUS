import { DashboardShell } from "../../dashboard-shell";
import { ComingSoon } from "@/components/coming-soon";
import { PackageSearch } from "lucide-react";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <DashboardShell role="student" title="Lost & Found">
      <ComingSoon
        title="Lost & Found"
        description="Report or search for lost and found items on campus."
        icon={<PackageSearch className="h-7 w-7" />}
        backHref="/student"
        backLabel="Back to dashboard"
        features={["Report lost items","Report found items","Search listings","In-platform communication"]}
      />
    </DashboardShell>
  );
}
