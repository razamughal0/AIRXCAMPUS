import type { ReactNode } from "react";
import { Card, Button, PageHeader } from "@/components/ui";
import { Compass, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function ComingSoon({
  title,
  description,
  icon,
  backHref,
  backLabel,
  features,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  backHref: string;
  backLabel: string;
  features?: string[];
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title={title} subtitle={description} />
      <Card padding="lg">
        <div className="text-center py-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-navy-50 to-cyan-50 ring-1 ring-navy-100 flex items-center justify-center mx-auto mb-4 text-navy-600">
            {icon || <Compass className="h-7 w-7" />}
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider">
            Prototype Module
          </div>
          <h3 className="mt-4 text-xl font-bold text-navy-950">{title}</h3>
          <p className="mt-2 text-slate-600 max-w-md mx-auto">{description}</p>
          {features && features.length > 0 && (
            <div className="mt-6 text-left max-w-sm mx-auto">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Planned features
              </div>
              <ul className="space-y-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-navy-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-8">
            <Link href={backHref}>
              <Button variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {backLabel}
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
