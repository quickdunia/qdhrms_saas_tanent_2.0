import * as XLSX from "xlsx";
import { NextResponse } from "next/server";

import { canPerformAction, resolvePermissionSet } from "@/lib/auth/permissions";
import { getAuthenticatedSession } from "@/lib/auth/sessions";
import { getCoreModuleWorkspace } from "@/lib/data/core-workspace";
import { getPhaseTwoModuleWorkspace } from "@/lib/data/phase-two";
import { getWorkspaceModuleBySlug } from "@/lib/modules/registry";
import { prisma } from "@/lib/prisma";
import { resolveFilterStatus } from "@/lib/utils";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintableHtml(title: string, rows: Array<Record<string, string | number | null>>) {
  const headers = Object.keys(rows[0] ?? {});
  const tableHead = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const tableBody = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
      .sheet { max-width: 1200px; margin: 0 auto; background: white; border-radius: 24px; padding: 32px; box-shadow: 0 18px 45px -24px rgba(15, 23, 42, 0.28); }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0 0 24px; color: #64748b; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; vertical-align: top; font-size: 14px; }
      th { background: #f8fafc; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; }
      @media print {
        body { background: white; padding: 0; }
        .sheet { box-shadow: none; border-radius: 0; max-width: none; padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1>${escapeHtml(title)}</h1>
      <p>Printable export generated from live tenant data.</p>
      <table>
        <thead><tr>${tableHead}</tr></thead>
        <tbody>${tableBody}</tbody>
      </table>
    </div>
    <script>window.print();</script>
  </body>
</html>`;
}

export async function GET(
  request: Request,
  context: { params: { tenantSlug: string; moduleSlug: string } },
) {
  const moduleDefinition = getWorkspaceModuleBySlug(context.params.moduleSlug);

  if (!moduleDefinition) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  const session = await getAuthenticatedSession();

  if (!session?.tenant || session.tenant.slug !== context.params.tenantSlug) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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

  if (!canPerformAction(permissionSet, "export")) {
    return NextResponse.json({ error: "Export access denied." }, { status: 403 });
  }

  const url = new URL(request.url);
  const rawFormat = url.searchParams.get("format");
  const format = rawFormat === "xlsx" ? "xlsx" : rawFormat === "print" ? "print" : "csv";
  const filterStatus = resolveFilterStatus(
    url.searchParams.get("status") ?? undefined,
    url.searchParams.get("filter") ?? undefined,
  );

  const workspace =
    moduleDefinition.kind === "phase-two"
      ? await getPhaseTwoModuleWorkspace({
          tenantId: session.tenant.id,
          module: moduleDefinition,
          search: url.searchParams.get("q") ?? undefined,
          status: filterStatus,
          page: "1",
          pageSize: 5000,
        })
      : await getCoreModuleWorkspace({
          tenantId: session.tenant.id,
          tenantSlug: context.params.tenantSlug,
          userId: session.user.id,
          userRole: session.user.role,
          module: moduleDefinition,
          search: url.searchParams.get("q") ?? undefined,
          status: filterStatus,
          page: "1",
          pageSize: 5000,
        });

  if (format === "print") {
    return new NextResponse(buildPrintableHtml(`${moduleDefinition.label} export`, workspace.exportRows), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  const sheet = XLSX.utils.json_to_sheet(workspace.exportRows);
  const fileName = `${context.params.tenantSlug}-${context.params.moduleSlug}-export.${format}`;

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Export");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
