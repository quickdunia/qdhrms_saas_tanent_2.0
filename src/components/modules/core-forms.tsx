import { Role } from "@prisma/client";

import {
  checkInAction,
  checkOutAction,
  createAnnouncementAction,
  createApprovalWorkflowAction,
  createAttendanceAction,
  createAttendanceRequestAction,
  createHolidayAction,
  createLeaveRequestAction,
  createLeaveTypeAction,
  createNotificationAction,
  createPayrollRunAction,
  createSalaryStructureAction,
  createShiftAction,
  updateApprovalTaskStatusAction,
} from "@/actions/operations";
import {
  bulkImportRecordsAction,
  createUserAction,
  saveRolePermissionAction,
  sendUserPasswordResetOtpAction,
  updateUserStatusAction,
} from "@/actions/users";
import { MODULE_KEYS, type ModuleKey } from "@/lib/auth/constants";
import type { CoreReferenceData } from "@/lib/data/core-workspace";
import type { CoreModuleDefinition } from "@/lib/modules/registry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function HiddenFields({
  tenantSlug,
  redirectTo,
}: {
  tenantSlug: string;
  redirectTo: string;
}) {
  return (
    <>
      <input name="tenantSlug" type="hidden" value={tenantSlug} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
    </>
  );
}

function hasModule(moduleKeys: ModuleKey[], moduleKey: ModuleKey) {
  return moduleKeys.includes(moduleKey);
}

export function CoreForms({
  availableModules,
  canAdd,
  canApprove,
  module,
  references,
  tenantSlug,
  userRole,
}: {
  availableModules: ModuleKey[];
  canAdd: boolean;
  canApprove: boolean;
  module: CoreModuleDefinition;
  references: CoreReferenceData;
  tenantSlug: string;
  userRole: Role;
}) {
  const redirectTo = `/t/${tenantSlug}/${module.slug}`;

  switch (module.key) {
    case "SELF_SERVICE":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Attendance actions" description="Use quick actions for today without leaving the workspace.">
            <div className="flex flex-wrap gap-3">
              <form action={checkInAction}>
                <FormSubmitButton variant="brand">Check in</FormSubmitButton>
              </form>
              <form action={checkOutAction}>
                <FormSubmitButton variant="outline">Check out</FormSubmitButton>
              </form>
            </div>
          </FormCard>

          {references.currentEmployee ? (
            <>
              <FormCard title="Request leave" description="Create a personal leave request with optional dates and reason.">
                <form action={createLeaveRequestAction} className="grid gap-4 md:grid-cols-2">
                  <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
                  <input name="employeeId" type="hidden" value={references.currentEmployee.id} />
                  <div className="space-y-2 md:col-span-2">
                    <Label>Leave type</Label>
                    <Select name="leaveTypeId">
                      <option value="">Select leave type</option>
                      {references.leaveTypes.map((leaveType) => (
                        <option key={leaveType.id} value={leaveType.id}>
                          {leaveType.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select defaultValue="FULL_DAY" name="durationType">
                      <option value="FULL_DAY">Full day</option>
                      <option value="HALF_DAY">Half day</option>
                      <option value="SHORT">Short leave</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total days</Label>
                    <Input defaultValue="1" name="totalDays" step="0.25" type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input name="startDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input name="endDate" type="date" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Reason</Label>
                    <Textarea name="reason" placeholder="Share your leave reason and any handover notes." />
                  </div>
                  <FormSubmitButton className="md:col-span-2" variant="brand">
                    Submit leave request
                  </FormSubmitButton>
                </form>
              </FormCard>

              <FormCard title="Attendance correction" description="Request a missed punch or time correction with supporting context.">
                <form action={createAttendanceRequestAction} className="grid gap-4 md:grid-cols-2">
                  <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
                  <input name="employeeId" type="hidden" value={references.currentEmployee.id} />
                  <div className="space-y-2">
                    <Label>Request type</Label>
                    <Select name="type">
                      <option value="MISSED_PUNCH">Missed punch</option>
                      <option value="CORRECTION">Correction</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input name="requestedDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Requested check-in</Label>
                    <Input name="requestedCheckInAt" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label>Requested check-out</Label>
                    <Input name="requestedCheckOutAt" type="datetime-local" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Reason</Label>
                    <Textarea name="reason" placeholder="Explain the attendance issue for review." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Attachment</Label>
                    <Input name="attachment" type="file" />
                  </div>
                  <FormSubmitButton className="md:col-span-2" variant="brand">
                    Submit correction
                  </FormSubmitButton>
                </form>
              </FormCard>
            </>
          ) : null}
        </div>
      );

    case "USERS":
      return canAdd ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <FormCard title="Create user" description="Provision a tenant user and send an OTP-based password invite.">
            <form action={createUserAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>First name</Label><Input name="firstName" placeholder="Anita" /></div>
                <div className="space-y-2"><Label>Last name</Label><Input name="lastName" placeholder="Sharma" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input name="email" placeholder="anita@example.com" type="email" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" placeholder="+91 9876543210" /></div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select defaultValue="HR_MANAGER" name="role">
                    {Object.values(Role).filter((role) => role !== "SUPER_ADMIN").map((role) => (
                      <option key={role} value={role}>{role.replaceAll("_", " ")}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue="PENDING" name="status">
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="HOLD">Hold</option>
                    <option value="SUSPENDED">Suspended</option>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
                <div className="space-y-2"><Label>Department</Label><Select name="departmentId"><option value="">Optional</option>{references.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></div>
                <div className="space-y-2 md:col-span-2"><Label>Profile photo</Label><Input name="profilePhoto" type="file" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Documents</Label><Input multiple name="documents" type="file" /></div>
              </div>
              <FormSubmitButton variant="brand">Create user</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Update user status" description="Adjust account state for a selected tenant user.">
            <form action={updateUserStatusAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>User</Label><Select name="userId"><option value="">Select user</option>{references.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</Select></div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status">
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="HOLD">Hold</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="LOCKED">Locked</option>
                  <option value="DELETED">Deleted</option>
                </Select>
              </div>
              <FormSubmitButton variant="outline">Save status</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Send OTP" description="Reissue password setup or reset OTP for an existing user.">
            <form action={sendUserPasswordResetOtpAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>User</Label><Select name="userId"><option value="">Select user</option>{references.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</Select></div>
              <FormSubmitButton variant="outline">Send password OTP</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      ) : null;

    case "ROLES":
      return canAdd || userRole === "TENANT_ADMIN" ? (
        <FormCard title="Permission override" description="Adjust module-level permissions for a role without changing the base architecture.">
          <form action={saveRolePermissionAction} className="grid gap-4 md:grid-cols-3">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="HR_MANAGER" name="role">
                {Object.values(Role).filter((role) => role !== "SUPER_ADMIN").map((role) => (
                  <option key={role} value={role}>{role.replaceAll("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Module</Label>
              <Select name="moduleKey">
                {MODULE_KEYS.filter((moduleKey) => moduleKey !== "SUBSCRIPTIONS").map((moduleKey) => (
                  <option key={moduleKey} value={moduleKey}>{moduleKey.replaceAll("_", " ")}</option>
                ))}
              </Select>
            </div>
            {["canView", "canAdd", "canEdit", "canDelete", "canApprove", "canExport"].map((name) => (
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700" key={name}>
                <input name={name} type="checkbox" />
                <span>{name.replace("can", "").trim()}</span>
              </label>
            ))}
            <div className="md:col-span-3">
              <FormSubmitButton variant="brand">Save permission override</FormSubmitButton>
            </div>
          </form>
        </FormCard>
      ) : null;

    case "ATTENDANCE":
      return (
        <div className="grid gap-6 xl:grid-cols-3">
          {hasModule(availableModules, "SHIFTS") ? (
            <FormCard title="Create shift" description="Set shift timings, grace periods, and weekly offs for attendance capture.">
              <form action={createShiftAction} className="space-y-4">
                <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
                <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="General shift" /></div>
                <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="GS" /></div>
                <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Start</Label><Input name="startTime" type="time" /></div>
                  <div className="space-y-2"><Label>End</Label><Input name="endTime" type="time" /></div>
                  <div className="space-y-2"><Label>Grace in</Label><Input defaultValue="10" name="graceInMinutes" type="number" /></div>
                  <div className="space-y-2"><Label>Grace out</Label><Input defaultValue="10" name="graceOutMinutes" type="number" /></div>
                  <div className="space-y-2"><Label>Half day min</Label><Input defaultValue="240" name="halfDayMinutes" type="number" /></div>
                  <div className="space-y-2"><Label>Full day min</Label><Input defaultValue="480" name="fullDayMinutes" type="number" /></div>
                  <div className="space-y-2"><Label>Overtime threshold</Label><Input defaultValue="480" name="overtimeThresholdMinutes" type="number" /></div>
                  <div className="space-y-2"><Label>Weekly offs</Label><Input defaultValue="Sunday" name="weeklyOffs" placeholder="Saturday, Sunday" /></div>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-700"><input name="isFlexible" type="checkbox" /> Flexible shift</label>
                <FormSubmitButton variant="outline">Create shift</FormSubmitButton>
              </form>
            </FormCard>
          ) : null}

          <FormCard title="Attendance entry" description="Create or update daily attendance with shift-aware working time.">
            <form action={createAttendanceAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Select employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Shift</Label><Select name="shiftId"><option value="">Optional</option>{references.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Date</Label><Input name="attendanceDate" type="date" /></div>
              <div className="space-y-2"><Label>Check in</Label><Input name="checkInAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Check out</Label><Input name="checkOutAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Source</Label><Select defaultValue="MANUAL" name="source"><option value="MANUAL">Manual</option><option value="SELF_SERVICE">Self service</option><option value="IMPORT">Import</option></Select></div>
              <div className="space-y-2"><Label>Remarks</Label><Textarea name="remarks" placeholder="Shift swap, work from site, or note." /></div>
              <FormSubmitButton variant="brand">Save attendance</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Attendance request" description="Submit a missed punch or correction request with optional attachment.">
            <form action={createAttendanceRequestAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Employee</Label><Select defaultValue={references.currentEmployee?.id ?? ""} name="employeeId"><option value="">Select employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Request type</Label><Select name="type"><option value="MISSED_PUNCH">Missed punch</option><option value="CORRECTION">Correction</option></Select></div>
              <div className="space-y-2"><Label>Requested date</Label><Input name="requestedDate" type="date" /></div>
              <div className="space-y-2"><Label>Requested check in</Label><Input name="requestedCheckInAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Requested check out</Label><Input name="requestedCheckOutAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Reason</Label><Textarea name="reason" placeholder="Share the reason for this attendance correction." /></div>
              <div className="space-y-2"><Label>Attachment</Label><Input name="attachment" type="file" /></div>
              <FormSubmitButton variant="outline">Submit request</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "LEAVE":
      return (
        <div className="grid gap-6 xl:grid-cols-3">
          <FormCard title="Create leave type" description="Configure paid or unpaid leave policies with annual quota rules.">
            <form action={createLeaveTypeAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Casual Leave" /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="CL" /></div>
              <div className="space-y-2"><Label>Annual quota</Label><Input defaultValue="12" name="annualQuota" step="0.5" type="number" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Policy guidance and usage notes." /></div>
              {["allowCarryForward", "allowHalfDay", "allowShortLeave", "isPaid", "requiresApproval"].map((name) => (
                <label className="flex items-center gap-3 text-sm text-slate-700" key={name}><input defaultChecked={name !== "allowCarryForward"} name={name} type="checkbox" /> {name.replace(/([A-Z])/g, " $1").trim()}</label>
              ))}
              <FormSubmitButton variant="outline">Create leave type</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Leave request" description="Create a leave request with attachment and employee mapping.">
            <form action={createLeaveRequestAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Employee</Label><Select defaultValue={references.currentEmployee?.id ?? ""} name="employeeId"><option value="">Select employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Leave type</Label><Select name="leaveTypeId"><option value="">Select leave type</option>{references.leaveTypes.map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Duration</Label><Select name="durationType"><option value="FULL_DAY">Full day</option><option value="HALF_DAY">Half day</option><option value="SHORT">Short leave</option></Select></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Start date</Label><Input name="startDate" type="date" /></div>
                <div className="space-y-2"><Label>End date</Label><Input name="endDate" type="date" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Total days</Label><Input defaultValue="1" name="totalDays" step="0.25" type="number" /></div>
              </div>
              <div className="space-y-2"><Label>Reason</Label><Textarea name="reason" placeholder="Reason, coverage note, or medical context." /></div>
              <div className="space-y-2"><Label>Attachment</Label><Input name="attachment" type="file" /></div>
              <FormSubmitButton variant="brand">Submit leave request</FormSubmitButton>
            </form>
          </FormCard>

          {hasModule(availableModules, "HOLIDAYS") ? (
            <FormCard title="Holiday calendar" description="Publish an upcoming holiday for tenant or branch scope.">
              <form action={createHolidayAction} className="space-y-4">
                <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
                <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Republic Day" /></div>
                <div className="space-y-2"><Label>Date</Label><Input name="holidayDate" type="date" /></div>
                <div className="space-y-2"><Label>Scope</Label><Select defaultValue="TENANT" name="scope"><option value="TENANT">Tenant</option><option value="BRANCH">Branch</option><option value="NATIONAL">National</option></Select></div>
                <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
                <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Any optional note for the holiday calendar." /></div>
                <label className="flex items-center gap-3 text-sm text-slate-700"><input name="isOptional" type="checkbox" /> Optional holiday</label>
                <FormSubmitButton variant="outline">Add holiday</FormSubmitButton>
              </form>
            </FormCard>
          ) : null}
        </div>
      );

    case "PAYROLL":
      return canAdd ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Salary structure" description="Configure base salary, allowances, and deductions as JSON arrays.">
            <form action={createSalaryStructureAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Manager CTC" /></div>
                <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="SAL-MGR" /></div>
              </div>
              <div className="space-y-2"><Label>Base salary</Label><Input defaultValue="50000" name="baseSalary" type="number" /></div>
              <div className="space-y-2"><Label>Allowances JSON</Label><Textarea defaultValue={`[{ "name": "HRA", "amount": 12000 }, { "name": "Special", "amount": 5000 }]`} name="allowances" /></div>
              <div className="space-y-2"><Label>Deductions JSON</Label><Textarea defaultValue={`[{ "name": "PF", "amount": 1800 }, { "name": "Professional Tax", "amount": 200 }]`} name="deductions" /></div>
              <FormSubmitButton variant="outline">Create structure</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Generate payroll" description="Create a payroll run for the selected month and branch scope.">
            <form action={createPayrollRunAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Month</Label><Input defaultValue={new Date().getMonth() + 1} name="month" type="number" /></div>
                <div className="space-y-2"><Label>Year</Label><Input defaultValue={new Date().getFullYear()} name="year" type="number" /></div>
                <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">All branches</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
                <div className="space-y-2"><Label>Status</Label><Select defaultValue="DRAFT" name="status"><option value="DRAFT">Draft</option><option value="PENDING_APPROVAL">Pending approval</option><option value="APPROVED">Approved</option></Select></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" placeholder="Payroll notes, cutoff assumptions, or processing context." /></div>
              <FormSubmitButton variant="brand">Generate payroll run</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      ) : null;

    case "ANNOUNCEMENTS":
      return canAdd ? (
        <FormCard title="Publish announcement" description="Broadcast a notice with scope, priority, expiry, and attachment.">
          <form action={createAnnouncementAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input name="title" placeholder="Payroll processing scheduled on Friday" /></div>
            <div className="space-y-2"><Label>Scope</Label><Select name="scope"><option value="ALL">All</option><option value="BRANCH">Branch</option><option value="DEPARTMENT">Department</option><option value="EMPLOYEE">Employee</option></Select></div>
            <div className="space-y-2"><Label>Priority</Label><Select defaultValue="NORMAL" name="priority"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></Select></div>
            <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
            <div className="space-y-2"><Label>Department</Label><Select name="departmentId"><option value="">Optional</option>{references.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Target employee</Label><Select name="targetEmployeeId"><option value="">Optional</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Content</Label><Textarea name="content" placeholder="Share the announcement details, action, and timeline." /></div>
            <div className="space-y-2"><Label>Expires at</Label><Input name="expiresAt" type="date" /></div>
            <div className="space-y-2"><Label>Attachment</Label><Input name="attachment" type="file" /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Publish announcement</FormSubmitButton>
          </form>
        </FormCard>
      ) : null;

    case "APPROVALS":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Approval workflow" description="Define level-based approval routing for a module.">
            <form action={createApprovalWorkflowAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Leave approval policy" /></div>
              <div className="space-y-2"><Label>Module</Label><Select defaultValue="LEAVE" name="moduleKey">{MODULE_KEYS.map((moduleKey) => <option key={moduleKey} value={moduleKey}>{moduleKey.replaceAll("_", " ")}</option>)}</Select></div>
              <div className="space-y-2"><Label>Step one role</Label><Select defaultValue="HR_MANAGER" name="stepOneRole">{Object.values(Role).filter((role) => role !== "SUPER_ADMIN").map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</Select></div>
              <div className="space-y-2"><Label>Step two role</Label><Select name="stepTwoRole"><option value="">Optional</option>{Object.values(Role).filter((role) => role !== "SUPER_ADMIN").map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</Select></div>
              <FormSubmitButton variant="outline">Save workflow</FormSubmitButton>
            </form>
          </FormCard>

          {canApprove ? (
            <FormCard title="Review task" description="Approve or reject a pending approval task from the tenant queue.">
              <form action={updateApprovalTaskStatusAction} className="space-y-4">
                <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
                <div className="space-y-2"><Label>Task</Label><Select name="taskId"><option value="">Select task</option>{references.approvalTasks.map((task) => <option key={task.id} value={task.id}>{task.label}</option>)}</Select></div>
                <div className="space-y-2"><Label>Decision</Label><Select name="status"><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELED">Canceled</option></Select></div>
                <div className="space-y-2"><Label>Comments</Label><Textarea name="comments" placeholder="Share your decision note or follow-up instruction." /></div>
                <FormSubmitButton variant="brand">Update approval task</FormSubmitButton>
              </form>
            </FormCard>
          ) : null}
        </div>
      );

    case "NOTIFICATIONS":
      return canAdd ? (
        <FormCard title="Create notification" description="Send an in-app or email notification to a user or employee.">
          <form action={createNotificationAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2"><Label>Type</Label><Select defaultValue="SYSTEM" name="type"><option value="SYSTEM">System</option><option value="RENEWAL">Renewal</option><option value="LEAVE">Leave</option><option value="PAYROLL">Payroll</option><option value="ATTENDANCE">Attendance</option><option value="NOTICE">Notice</option><option value="SECURITY">Security</option><option value="APPROVAL">Approval</option></Select></div>
            <div className="space-y-2"><Label>Channel</Label><Select defaultValue="IN_APP" name="channel"><option value="IN_APP">In app</option><option value="EMAIL">Email</option><option value="BOTH">Both</option></Select></div>
            <div className="space-y-2"><Label>User</Label><Select name="userId"><option value="">Optional</option>{references.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</Select></div>
            <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Optional</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input name="title" placeholder="Payroll run approved" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Message</Label><Textarea name="message" placeholder="Share the key notification message and next step." /></div>
            <div className="space-y-2 md:col-span-2"><Label>Link</Label><Input name="link" placeholder={`/t/${tenantSlug}`} /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Create notification</FormSubmitButton>
          </form>
        </FormCard>
      ) : null;

    case "IMPORT_EXPORT":
      return canAdd ? (
        <FormCard title="Bulk import" description="Upload an Excel file to import users or employees into the tenant workspace.">
          <form action={bulkImportRecordsAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2"><Label>Import type</Label><Select defaultValue="USERS" name="type"><option value="USERS">Users</option><option value="EMPLOYEES">Employees</option><option value="ATTENDANCE">Attendance</option></Select></div>
            <div className="space-y-2"><Label>Workbook</Label><Input name="file" type="file" /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Run import</FormSubmitButton>
          </form>
        </FormCard>
      ) : null;

    default:
      return null;
  }
}
