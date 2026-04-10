import { notFound } from "next/navigation";

import { CoreWorkspacePage } from "@/components/modules/core-workspace";
import { PhaseTwoWorkspacePage } from "@/components/modules/phase-two-workspace";
import { requireTenantModulePermission } from "@/lib/auth/guards";
import { resolvePermissionSet } from "@/lib/auth/permissions";
import { getCoreModuleWorkspace, getCoreReferenceData } from "@/lib/data/core-workspace";
import { getPhaseTwoModuleWorkspace, getPhaseTwoReferenceData } from "@/lib/data/phase-two";
import { getWorkspaceModuleBySlug } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { getSearchParamValue, resolveFilterStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenantPhaseTwoModulePage({
  params,
  searchParams,
}: {
  params: { tenantSlug: string; moduleSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const moduleDefinition = getWorkspaceModuleBySlug(params.moduleSlug);

  if (!moduleDefinition) {
    notFound();
  }

  const session = await requireTenantModulePermission(params.tenantSlug, moduleDefinition.key, "view");
  const override = await prisma.rolePermission.findUnique({
    where: {
      tenantId_role_moduleKey: {
        tenantId: session.tenant.id,
        role: session.user.role,
        moduleKey: moduleDefinition.key,
      },
    },
  });
  const permissionSet = resolvePermissionSet(session.user.role, moduleDefinition.key, override);
  const q = getSearchParamValue(searchParams?.q);
  const feedbackStatus = getSearchParamValue(searchParams?.status);
  const status = resolveFilterStatus(feedbackStatus, searchParams?.filter);
  const message = getSearchParamValue(searchParams?.message);

  if (moduleDefinition.kind === "phase-two") {
    const [workspace, references] = await Promise.all([
      getPhaseTwoModuleWorkspace({
        tenantId: session.tenant.id,
        module: moduleDefinition,
        search: q,
        status,
        page: getSearchParamValue(searchParams?.page, "1"),
      }),
      getPhaseTwoReferenceData(session.tenant.id),
    ]);

    return (
      <PhaseTwoWorkspacePage
        feedbackStatus={feedbackStatus}
        message={message}
        module={moduleDefinition}
        references={references}
        search={q}
        status={status}
        tenantSlug={params.tenantSlug}
        workspace={workspace}
      />
    );
  }

  const [workspace, references] = await Promise.all([
    getCoreModuleWorkspace({
      tenantId: session.tenant.id,
      tenantSlug: params.tenantSlug,
      userId: session.user.id,
      userRole: session.user.role,
      module: moduleDefinition,
      search: q,
      status,
      page: getSearchParamValue(searchParams?.page, "1"),
    }),
    getCoreReferenceData(session.tenant.id, session.user.id),
  ]);

  return (
    <CoreWorkspacePage
      availableModules={session.tenant.allowedModules}
      canAdd={permissionSet.add}
      canApprove={permissionSet.approve}
      feedbackStatus={feedbackStatus}
      message={message}
      module={moduleDefinition}
      references={references}
      search={q}
      status={status}
      tenantSlug={params.tenantSlug}
      userRole={session.user.role}
      workspace={workspace}
    />
  );
}
