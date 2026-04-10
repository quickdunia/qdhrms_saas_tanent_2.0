import { Role, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

type DashboardMetric = {
  id: string;
  label: string;
  value: string | number;
  description: string;
};

type DashboardDetailItem = {
  label: string;
  value: string;
  description?: string;
};

type RoleHighlights = {
  eyebrow: string;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  detailTitle: string;
  detailDescription: string;
  detailItems: DashboardDetailItem[];
};

const OPERATIONS_ROLES = new Set<Role>([
  Role.TENANT_ADMIN,
  Role.HR_MANAGER,
  Role.HR_EXECUTIVE,
  Role.BRANCH_MANAGER,
  Role.DEPARTMENT_HEAD,
]);

const PAYROLL_ROLES = new Set<Role>([Role.PAYROLL_MANAGER, Role.ACCOUNTS_MANAGER]);

export async function getSuperAdminOverview() {
  const [
    totalTenants,
    activeTenants,
    totalEmployees,
    pendingAdmins,
    recentTenants,
    recentLogins,
    planCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.employee.count(),
    prisma.user.count({
      where: {
        role: Role.TENANT_ADMIN,
        status: UserStatus.PENDING,
      },
    }),
    prisma.tenant.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        subscriptions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            plan: true,
          },
        },
      },
    }),
    prisma.loginAudit.findMany({
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.subscriptionPlan.count(),
  ]);

  return {
    totalTenants,
    activeTenants,
    totalEmployees,
    pendingAdmins,
    planCount,
    recentTenants,
    recentLogins,
  };
}

async function getRoleHighlights(input: {
  tenantId: string;
  userId: string;
  role: Role;
  employeeCount: number;
  activeSessionCount: number;
  openJobCount: number;
  onboardingCount: number;
  helpdeskOpenCount: number;
  documentCount: number;
}): Promise<RoleHighlights> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const currentYear = now.getFullYear();

  if (input.role === Role.EMPLOYEE) {
    const employee = await prisma.employee.findFirst({
      where: {
        tenantId: input.tenantId,
        userAccountId: input.userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        joinDate: true,
        branch: {
          select: {
            name: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
        leaveBalances: {
          where: {
            year: currentYear,
          },
          orderBy: {
            remainingBalance: "desc",
          },
          take: 3,
          select: {
            remainingBalance: true,
            leaveType: {
              select: {
                name: true,
              },
            },
          },
        },
        payrollItems: {
          take: 1,
          orderBy: [{ payrollRun: { year: "desc" } }, { payrollRun: { month: "desc" } }, { createdAt: "desc" }],
          select: {
            netPay: true,
            payrollRun: {
              select: {
                month: true,
                year: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      const unreadNotifications = await prisma.notification.count({
        where: {
          tenantId: input.tenantId,
          userId: input.userId,
          isRead: false,
        },
      });

      return {
        eyebrow: "Employee cockpit",
        title: "Personal workspace",
        description:
          "Your account is active, but the employee master profile is not linked yet. HR can map the portal user to the employee record from the users or onboarding workspace.",
        metrics: [
          {
            id: "unread-notifications",
            label: "Unread alerts",
            value: unreadNotifications,
            description: "Unread notifications waiting in your workspace.",
          },
          {
            id: "active-sessions",
            label: "Active sessions",
            value: input.activeSessionCount,
            description: "Current non-revoked sessions across the tenant workspace.",
          },
        ],
        detailTitle: "Profile sync",
        detailDescription: "Once the employee master record is linked, leave, attendance, and payroll insights will appear here.",
        detailItems: [{ label: "Status", value: "Awaiting employee profile mapping" }],
      } satisfies RoleHighlights;
    }

    const [attendanceThisMonth, pendingLeaveRequests, unreadNotifications] = await Promise.all([
      prisma.attendanceRecord.count({
        where: {
          tenantId: input.tenantId,
          employeeId: employee.id,
          attendanceDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          tenantId: input.tenantId,
          employeeId: employee.id,
          status: "PENDING",
        },
      }),
      prisma.notification.count({
        where: {
          tenantId: input.tenantId,
          isRead: false,
          OR: [{ userId: input.userId }, { employeeId: employee.id }],
        },
      }),
    ]);

    const totalLeaveRemaining = employee.leaveBalances.reduce(
      (sum, balance) => sum + Number(balance.remainingBalance ?? 0),
      0,
    );
    const latestPayslip = employee.payrollItems[0] ?? null;

    return {
      eyebrow: "Employee cockpit",
      title: `${employee.firstName}${employee.lastName ? ` ${employee.lastName}` : ""}`,
      description: "Track your attendance, leave pipeline, payroll readiness, and workspace alerts from one place.",
      metrics: [
        {
          id: "attendance-month",
          label: "Attendance this month",
          value: attendanceThisMonth,
          description: "Attendance records captured in the current payroll month.",
        },
        {
          id: "leave-pending",
          label: "Pending leave",
          value: pendingLeaveRequests,
          description: "Leave requests awaiting manager or HR action.",
        },
        {
          id: "leave-balance",
          label: "Leave balance",
          value: totalLeaveRemaining,
          description: "Combined remaining balance across your active leave buckets.",
        },
        {
          id: "latest-pay",
          label: "Latest net pay",
          value: latestPayslip ? formatCurrency(Number(latestPayslip.netPay)) : "Not generated",
          description: "Most recent payslip amount available in your payroll workspace.",
        },
      ],
      detailTitle: "Profile snapshot",
      detailDescription: "A quick view of your employment context and latest payroll visibility.",
      detailItems: [
        { label: "Role", value: employee.jobTitle },
        { label: "Department", value: employee.department.name },
        { label: "Branch", value: employee.branch.name },
        { label: "Joined", value: formatDate(employee.joinDate) },
        { label: "Unread alerts", value: `${unreadNotifications}` },
        ...employee.leaveBalances.map((balance) => ({
          label: balance.leaveType.name,
          value: `${Number(balance.remainingBalance ?? 0)} days`,
          description: "Remaining balance in the current year.",
        })),
      ],
    } satisfies RoleHighlights;
  }

  if (PAYROLL_ROLES.has(input.role)) {
    const [draftRuns, approvalRuns, processedRuns, currentMonthPayout] = await Promise.all([
      prisma.payrollRun.count({
        where: {
          tenantId: input.tenantId,
          status: "DRAFT",
        },
      }),
      prisma.payrollRun.count({
        where: {
          tenantId: input.tenantId,
          status: "PENDING_APPROVAL",
        },
      }),
      prisma.payrollRun.count({
        where: {
          tenantId: input.tenantId,
          status: {
            in: ["PROCESSED", "PAID"],
          },
        },
      }),
      prisma.payrollRun.aggregate({
        where: {
          tenantId: input.tenantId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        _sum: {
          totalNet: true,
        },
      }),
    ]);

    return {
      eyebrow: "Payroll command center",
      title: "Payroll readiness",
      description: "Monitor draft cycles, approval queues, and payout exposure before each payroll closes.",
      metrics: [
        {
          id: "draft-runs",
          label: "Draft runs",
          value: draftRuns,
          description: "Payroll cycles still being reviewed or prepared.",
        },
        {
          id: "approval-runs",
          label: "Awaiting approval",
          value: approvalRuns,
          description: "Payroll runs that need a final approval action.",
        },
        {
          id: "processed-runs",
          label: "Processed runs",
          value: processedRuns,
          description: "Payroll batches already processed or marked paid.",
        },
        {
          id: "month-payout",
          label: "Current month payout",
          value: formatCurrency(Number(currentMonthPayout._sum.totalNet ?? 0)),
          description: "Net payroll exposure across runs created this month.",
        },
      ],
      detailTitle: "Operational pulse",
      detailDescription: "Supporting metrics that affect payroll execution and release confidence.",
      detailItems: [
        { label: "Employees in tenant", value: `${input.employeeCount}` },
        { label: "Helpdesk queue", value: `${input.helpdeskOpenCount}` },
        { label: "Governed documents", value: `${input.documentCount}` },
        { label: "Active sessions", value: `${input.activeSessionCount}` },
      ],
    } satisfies RoleHighlights;
  }

  if (OPERATIONS_ROLES.has(input.role)) {
    const [pendingApprovalTasks, pendingAttendanceRequests, pendingLeaveRequests, newJoinersThisMonth] =
      await Promise.all([
        prisma.approvalTask.count({
          where: {
            tenantId: input.tenantId,
            status: "PENDING",
            OR: [{ assignedRole: input.role }, { assignedUserId: input.userId }],
          },
        }),
        prisma.attendanceRequest.count({
          where: {
            tenantId: input.tenantId,
            status: "PENDING",
          },
        }),
        prisma.leaveRequest.count({
          where: {
            tenantId: input.tenantId,
            status: "PENDING",
          },
        }),
        prisma.employee.count({
          where: {
            tenantId: input.tenantId,
            joinDate: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        }),
      ]);

    return {
      eyebrow: "Operations pulse",
      title: "Workforce command board",
      description: "Keep approvals, people operations, onboarding, and service queues moving without leaving the tenant dashboard.",
      metrics: [
        {
          id: "headcount",
          label: "Headcount",
          value: input.employeeCount,
          description: "Employees currently registered in the tenant workspace.",
        },
        {
          id: "approval-queue",
          label: "My approval queue",
          value: pendingApprovalTasks,
          description: "Approval tasks assigned to your role or directly to your user.",
        },
        {
          id: "leave-queue",
          label: "Pending leave",
          value: pendingLeaveRequests,
          description: "Leave requests still awaiting review or completion.",
        },
        {
          id: "attendance-queue",
          label: "Attendance fixes",
          value: pendingAttendanceRequests,
          description: "Attendance correction and regularization requests pending review.",
        },
      ],
      detailTitle: "Operational pulse",
      detailDescription: "Signals that affect workforce readiness, staffing flow, and internal service health.",
      detailItems: [
        { label: "New joiners this month", value: `${newJoinersThisMonth}` },
        { label: "Open requisitions", value: `${input.openJobCount}` },
        { label: "Onboarding in progress", value: `${input.onboardingCount}` },
        { label: "Open helpdesk tickets", value: `${input.helpdeskOpenCount}` },
      ],
    } satisfies RoleHighlights;
  }

  const unreadNotifications = await prisma.notification.count({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      isRead: false,
    },
  });

  return {
    eyebrow: "Workspace pulse",
    title: "Tenant overview",
    description: "A lightweight summary of people, security, and operational activity across the tenant workspace.",
    metrics: [
      {
        id: "employees",
        label: "Employees",
        value: input.employeeCount,
        description: "Employees currently registered in the tenant workspace.",
      },
      {
        id: "sessions",
        label: "Active sessions",
        value: input.activeSessionCount,
        description: "Non-revoked sessions still active right now.",
      },
      {
        id: "alerts",
        label: "Unread alerts",
        value: unreadNotifications,
        description: "Unread notifications targeted directly to your user account.",
      },
      {
        id: "documents",
        label: "Vault documents",
        value: input.documentCount,
        description: "Governed documents stored in the tenant vault.",
      },
    ],
    detailTitle: "Operational pulse",
    detailDescription: "Core operating signals available for every tenant role.",
    detailItems: [
      { label: "Open requisitions", value: `${input.openJobCount}` },
      { label: "Onboarding in progress", value: `${input.onboardingCount}` },
      { label: "Open helpdesk tickets", value: `${input.helpdeskOpenCount}` },
    ],
  } satisfies RoleHighlights;
}

export async function getTenantOverview(input: {
  tenantId: string;
  userId: string;
  role: Role;
}) {
  const [
    collegeCount,
    branchCount,
    departmentCount,
    employeeCount,
    activeSessionCount,
    openJobCount,
    onboardingCount,
    helpdeskOpenCount,
    documentCount,
    recentEmployees,
    recentLogins,
  ] = await Promise.all([
    prisma.college.count({
      where: {
        tenantId: input.tenantId,
      },
    }),
    prisma.branch.count({
      where: {
        tenantId: input.tenantId,
      },
    }),
    prisma.department.count({
      where: {
        tenantId: input.tenantId,
      },
    }),
    prisma.employee.count({
      where: {
        tenantId: input.tenantId,
      },
    }),
    prisma.authSession.count({
      where: {
        tenantId: input.tenantId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    }),
    prisma.jobOpening.count({
      where: {
        tenantId: input.tenantId,
        status: "OPEN",
      },
    }),
    prisma.onboardingPlan.count({
      where: {
        tenantId: input.tenantId,
        status: {
          in: ["PENDING", "IN_PROGRESS"],
        },
      },
    }),
    prisma.helpdeskTicket.count({
      where: {
        tenantId: input.tenantId,
        status: {
          in: ["OPEN", "IN_PROGRESS", "ESCALATED"],
        },
      },
    }),
    prisma.documentVaultRecord.count({
      where: {
        tenantId: input.tenantId,
      },
    }),
    prisma.employee.findMany({
      where: {
        tenantId: input.tenantId,
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        department: true,
        branch: true,
      },
    }),
    prisma.loginAudit.findMany({
      where: {
        tenantId: input.tenantId,
      },
      take: 8,
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const hydratedRoleHighlights = await getRoleHighlights({
    tenantId: input.tenantId,
    userId: input.userId,
    role: input.role,
    employeeCount,
    activeSessionCount,
    openJobCount,
    onboardingCount,
    helpdeskOpenCount,
    documentCount,
  });

  return {
    collegeCount,
    branchCount,
    departmentCount,
    employeeCount,
    activeSessionCount,
    openJobCount,
    onboardingCount,
    helpdeskOpenCount,
    documentCount,
    recentEmployees,
    recentLogins,
    roleHighlights: hydratedRoleHighlights,
  };
}
