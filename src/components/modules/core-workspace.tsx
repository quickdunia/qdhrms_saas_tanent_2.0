import Link from "next/link";
import { Download, Search } from "lucide-react";
import { Role } from "@prisma/client";

import { CoreForms } from "@/components/modules/core-forms";
import { ResponsiveRecords } from "@/components/modules/responsive-records";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackAlert } from "@/components/ui/feedback-alert";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import type { ModuleKey } from "@/lib/auth/constants";
import type { CoreReferenceData, CoreWorkspace } from "@/lib/data/core-workspace";
import type { CoreModuleDefinition } from "@/lib/modules/registry";
import { buildRedirectUrl } from "@/lib/utils";

export function CoreWorkspacePage({
  availableModules,
  canAdd,
  canApprove,
  feedbackStatus,
  message,
  module,
  references,
  search,
  status,
  tenantSlug,
  userRole,
  workspace,
}: {
  availableModules: ModuleKey[];
  canAdd: boolean;
  canApprove: boolean;
  feedbackStatus?: string;
  message?: string;
  module: CoreModuleDefinition;
  references: CoreReferenceData;
  search?: string;
  status?: string;
  tenantSlug: string;
  userRole: Role;
  workspace: CoreWorkspace;
}) {
  const basePath = `/t/${tenantSlug}/${module.slug}`;
  const buildHref = (page: number) =>
    buildRedirectUrl(basePath, {
      page: String(page),
      q: search,
      filter: status,
    });

  return (
    <div className="space-y-6">
      <FeedbackAlert message={message} status={feedbackStatus} />

      <PageHeader
        title={module.label}
        description={module.description}
        actions={
          <>
            <Button asChild size="sm" variant="secondary">
              <Link href={`${basePath}/export?format=csv`}>
                <Download className="h-4 w-4" />
                CSV export
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`${basePath}/export?format=xlsx`}>
                <Download className="h-4 w-4" />
                Excel export
              </Link>
            </Button>
            <Button asChild size="sm" variant="brand">
              <Link href={`${basePath}/export?format=print`}>
                <Download className="h-4 w-4" />
                Print / PDF
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {workspace.metrics.map((metric) => (
          <StatCard
            key={metric.label}
            description={metric.description}
            icon={<Download className="h-5 w-5" />}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <CoreForms
            availableModules={availableModules}
            canAdd={canAdd}
            canApprove={canApprove}
            module={module}
            references={references}
            tenantSlug={tenantSlug}
            userRole={userRole}
          />
        </div>

        <Card className={`border-slate-200 bg-gradient-to-br ${module.accent}`}>
          <CardHeader>
            <CardTitle>Operational insights</CardTitle>
            <CardDescription>
              Snapshot guidance pulled from live operational data for this module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.insights.map((insight) => (
              <div className="rounded-3xl border border-white/70 bg-white/80 p-5" key={insight.title}>
                <p className="text-sm text-slate-500">{insight.title}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{insight.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{insight.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{module.label} register</CardTitle>
          <CardDescription>
            Search, filter, and export the current operational slice as needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-11" defaultValue={search} name="q" placeholder={workspace.searchPlaceholder} />
            </div>
            {workspace.statusOptions.length > 0 ? (
              <Select defaultValue={status || ""} name="filter">
                <option value="">All statuses</option>
                {workspace.statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            ) : (
              <div />
            )}
            <Button type="submit" variant="outline">
              Apply filters
            </Button>
          </form>

          {workspace.rows.length === 0 ? (
            <EmptyState description={workspace.emptyDescription} title={workspace.emptyTitle} />
          ) : (
            <>
              <ResponsiveRecords rows={workspace.rows} />
              <PaginationControls buildHref={buildHref} page={workspace.page} totalPages={workspace.totalPages} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
