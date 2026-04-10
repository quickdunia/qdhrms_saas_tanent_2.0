import {
  createAppraisalCycleAction,
  createAssetCategoryAction,
  createAssetItemAction,
  createCandidateAction,
  createDocumentFolderAction,
  createDynamicFormAction,
  createHelpdeskTicketAction,
  createInternalTaskAction,
  createJobOpeningAction,
  createOffboardingRequestAction,
  createOnboardingPlanAction,
  createPerformanceKpiAction,
  createTrainingProgramAction,
  nominateEmployeeAction,
  scheduleInterviewAction,
  submitDynamicFormResponseAction,
  upsertIntegrationEndpointAction,
  uploadVaultDocumentAction,
  assignAssetAction,
  addTicketCommentAction,
  convertCandidateToEmployeeAction,
} from "@/actions/phase-two";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PhaseTwoReferences } from "@/lib/data/phase-two";
import type { PhaseTwoModuleDefinition } from "@/lib/modules/registry";

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

function HiddenFields({ tenantSlug, redirectTo }: { tenantSlug: string; redirectTo: string }) {
  return (
    <>
      <input name="tenantSlug" type="hidden" value={tenantSlug} />
      <input name="redirectTo" type="hidden" value={redirectTo} />
    </>
  );
}

export function PhaseTwoForms({
  module,
  tenantSlug,
  references,
}: {
  module: PhaseTwoModuleDefinition;
  tenantSlug: string;
  references: PhaseTwoReferences;
}) {
  const redirectTo = `/t/${tenantSlug}/${module.slug}`;

  switch (module.key) {
    case "RECRUITMENT":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Open a requisition" description="Create a vacancy aligned to the right branch and department.">
            <form action={createJobOpeningAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Job title</Label><Input name="title" placeholder="Senior Recruiter" /></div>
              <div className="space-y-2"><Label>Job code</Label><Input name="code" placeholder="JOB-1001" /></div>
              <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">All branches</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
              <div className="space-y-2"><Label>Department</Label><Select name="departmentId"><option value="">All departments</option>{references.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></div>
              <div className="space-y-2"><Label>Openings</Label><Input defaultValue="1" name="openingsCount" type="number" /></div>
              <div className="space-y-2"><Label>Status</Label><Select defaultValue="OPEN" name="status"><option value="OPEN">Open</option><option value="DRAFT">Draft</option><option value="ON_HOLD">On hold</option></Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Role summary, expectations, and hiring notes." /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Create job opening</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Add candidate" description="Capture applicants, resume files, and sourcing details from the same workspace.">
            <form action={createCandidateAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2 md:col-span-2"><Label>Job opening</Label><Select name="jobOpeningId"><option value="">Select requisition</option>{references.jobOpenings.map((job) => <option key={job.id} value={job.id}>{job.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>First name</Label><Input name="firstName" placeholder="Ananya" /></div>
              <div className="space-y-2"><Label>Last name</Label><Input name="lastName" placeholder="Sharma" /></div>
              <div className="space-y-2"><Label>Email</Label><Input name="email" placeholder="candidate@example.com" type="email" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input name="phone" placeholder="+91 9000000000" /></div>
              <div className="space-y-2"><Label>Source</Label><Input name="source" placeholder="LinkedIn" /></div>
              <div className="space-y-2"><Label>Experience years</Label><Input defaultValue="0" name="experienceYears" type="number" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Resume</Label><Input name="resume" type="file" /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Add candidate</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Schedule interview" description="Move shortlisted candidates into a structured interview calendar.">
            <form action={scheduleInterviewAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2 md:col-span-2"><Label>Candidate</Label><Select name="candidateId"><option value="">Select candidate</option>{references.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Interview type</Label><Select name="interviewType"><option value="SCREENING">Screening</option><option value="TECHNICAL">Technical</option><option value="HR">HR</option><option value="FINAL">Final</option></Select></div>
              <div className="space-y-2"><Label>Duration minutes</Label><Input defaultValue="60" name="durationMinutes" type="number" /></div>
              <div className="space-y-2"><Label>Scheduled at</Label><Input name="scheduledAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Mode</Label><Input name="mode" placeholder="Google Meet / Office" /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Schedule interview</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Convert to employee" description="Move a hired candidate into employee master data and kick off onboarding.">
            <form action={convertCandidateToEmployeeAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2 md:col-span-2"><Label>Candidate</Label><Select name="candidateId"><option value="">Select hired candidate</option>{references.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Employee code</Label><Input name="employeeCode" placeholder="EMP-2401" /></div>
              <div className="space-y-2"><Label>Job title</Label><Input name="jobTitle" placeholder="HR Executive" /></div>
              <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Select branch</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
              <div className="space-y-2"><Label>Department</Label><Select name="departmentId"><option value="">Select department</option>{references.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></div>
              <div className="space-y-2"><Label>Join date</Label><Input name="joinDate" type="date" /></div>
              <div className="space-y-2"><Label>Portal role</Label><Select defaultValue="EMPLOYEE" name="assignedRole"><option value="EMPLOYEE">Employee</option><option value="HR_EXECUTIVE">HR Executive</option><option value="DEPARTMENT_HEAD">Department Head</option></Select></div>
              <div className="space-y-2"><Label>Employment type</Label><Select defaultValue="FULL_TIME" name="employmentType"><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option><option value="INTERN">Intern</option></Select></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Convert candidate</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "ONBOARDING":
      return (
        <FormCard title="Create onboarding plan" description="Set joining dates, probation tracking, role mapping, and first-login readiness.">
          <form action={createOnboardingPlanAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2"><Label>Onboarding code</Label><Input name="onboardingCode" placeholder="ONB-2401" /></div>
            <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Optional existing employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
            <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Select branch</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
            <div className="space-y-2"><Label>Department</Label><Select name="departmentId"><option value="">Select department</option>{references.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></div>
            <div className="space-y-2"><Label>Joining date</Label><Input name="joiningDate" type="date" /></div>
            <div className="space-y-2"><Label>Probation days</Label><Input defaultValue="90" name="probationDays" type="number" /></div>
            <div className="space-y-2"><Label>Assigned role</Label><Select defaultValue="EMPLOYEE" name="assignedRole"><option value="EMPLOYEE">Employee</option><option value="HR_EXECUTIVE">HR Executive</option><option value="DEPARTMENT_HEAD">Department Head</option></Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea name="notes" placeholder="Welcome instructions, asset planning, or joining notes." /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Create onboarding plan</FormSubmitButton>
          </form>
        </FormCard>
      );

    case "OFFBOARDING":
      return (
        <FormCard title="Log offboarding case" description="Capture resignation, notice, and settlement workflow in a governed way.">
          <form action={createOffboardingRequestAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Select employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
            <div className="space-y-2"><Label>Exit code</Label><Input name="exitCode" placeholder="EXT-1001" /></div>
            <div className="space-y-2"><Label>Exit type</Label><Select name="type"><option value="RESIGNATION">Resignation</option><option value="TERMINATION">Termination</option><option value="RETIREMENT">Retirement</option><option value="END_OF_CONTRACT">End of contract</option></Select></div>
            <div className="space-y-2"><Label>Last working day</Label><Input name="lastWorkingDay" type="date" /></div>
            <div className="space-y-2"><Label>Notice start</Label><Input name="noticeStartAt" type="date" /></div>
            <div className="space-y-2"><Label>Notice end</Label><Input name="noticeEndAt" type="date" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Reason</Label><Textarea name="reason" placeholder="Resignation reason, exit notes, and context." /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Create offboarding request</FormSubmitButton>
          </form>
        </FormCard>
      );

    case "ASSET_MANAGEMENT":
      return (
        <div className="grid gap-6 xl:grid-cols-3">
          <FormCard title="Create category" description="Define category defaults for warranty and AMC tracking.">
            <form action={createAssetCategoryAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Laptop" /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="LAP" /></div>
              <div className="space-y-2"><Label>Warranty days</Label><Input name="warrantyTemplateDays" type="number" /></div>
              <div className="space-y-2"><Label>AMC days</Label><Input name="amcCycleDays" type="number" /></div>
              <FormSubmitButton variant="brand">Create category</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Register asset" description="Create inventory records with branch and expiry details.">
            <form action={createAssetItemAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Category</Label><Select name="categoryId"><option value="">Select category</option>{references.assetCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Asset code</Label><Input name="assetCode" placeholder="AST-1001" /></div>
              <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="MacBook Pro 14" /></div>
              <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional branch</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
              <div className="space-y-2"><Label>Warranty expiry</Label><Input name="warrantyExpiry" type="date" /></div>
              <FormSubmitButton variant="brand">Register asset</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Assign asset" description="Allocate employee assets with due-back tracking.">
            <form action={assignAssetAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Asset ID</Label><Input name="assetId" placeholder="Paste asset id from list" /></div>
              <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Select employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Due back</Label><Input name="dueBackAt" type="date" /></div>
              <div className="space-y-2"><Label>Issue notes</Label><Textarea name="issueRemarks" placeholder="Bag, charger, adapter included." /></div>
              <FormSubmitButton variant="brand">Assign asset</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "HELPDESK":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Create ticket" description="Log a grievance or service request with ownership and priority.">
            <form action={createHelpdeskTicketAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Ticket number</Label><Input name="ticketNumber" placeholder="TKT-1001" /></div>
              <div className="space-y-2"><Label>Priority</Label><Select name="priority"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></Select></div>
              <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Optional employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Assigned staff</Label><Select name="assignedToId"><option value="">Optional assignee</option>{references.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Category</Label><Input name="category" placeholder="Payroll / Behavior / Admin" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Subject</Label><Input name="subject" placeholder="Payslip discrepancy" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Describe the concern, impact, and expected resolution." /></div>
              <div className="space-y-2 md:col-span-2"><Label>Attachment</Label><Input name="attachment" type="file" /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Create ticket</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Add comment" description="Keep conversations and escalation notes attached to the same ticket thread.">
            <form action={addTicketCommentAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Ticket ID</Label><Input name="ticketId" placeholder="Paste ticket id from list" /></div>
              <div className="space-y-2"><Label>Comment</Label><Textarea name="message" placeholder="Investigation update, resolution note, or escalation context." /></div>
              <FormSubmitButton variant="brand">Add comment</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "DYNAMIC_FORMS":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Create custom form" description="Define field schema, audience scope, and response behavior.">
            <form action={createDynamicFormAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="Exit feedback form" /></div>
                <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="FORM-1001" /></div>
                <div className="space-y-2"><Label>Scope</Label><Select name="scope"><option value="ALL_EMPLOYEES">All employees</option><option value="BRANCH">Branch</option><option value="DEPARTMENT">Department</option><option value="ROLE">Role</option><option value="INDIVIDUAL">Individual</option></Select></div>
                <div className="space-y-2"><Label>Target value</Label><Input name="targetValue" placeholder="Branch id / Department id / Role" /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" placeholder="Describe why and when this form should be used." /></div>
              <div className="space-y-2"><Label>Schema JSON</Label><Textarea defaultValue={`[\n  { "type": "TEXT", "label": "Question", "required": true },\n  { "type": "DATE", "label": "Effective date", "required": false }\n]`} name="schemaJson" /></div>
              <FormSubmitButton variant="brand">Create form</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Capture response" description="Store a response payload securely for testing or administrative capture.">
            <form action={submitDynamicFormResponseAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Form</Label><Select name="formId"><option value="">Select form</option>{references.forms.map((form) => <option key={form.id} value={form.id}>{form.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Optional employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Response JSON</Label><Textarea defaultValue={`{ "question": "Answer", "effectiveDate": "2026-04-09" }`} name="responseJson" /></div>
              <div className="space-y-2"><Label>Attachment</Label><Input name="attachment" type="file" /></div>
              <FormSubmitButton variant="brand">Submit response</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "PERFORMANCE":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Create KPI" description="Build reusable KPI definitions with weight and ownership context.">
            <form action={createPerformanceKpiAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="Hiring turnaround time" /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="KPI-1001" /></div>
              <div className="space-y-2"><Label>Weight</Label><Input defaultValue="20" name="weight" type="number" /></div>
              <div className="space-y-2"><Label>Role name</Label><Input name="roleName" placeholder="HR Manager" /></div>
              <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional branch</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
              <div className="space-y-2"><Label>Department</Label><Select name="departmentId"><option value="">Optional department</option>{references.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Explain how this KPI is scored and reviewed." /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Create KPI</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Launch appraisal cycle" description="Create a review window for self, manager, and HR stages.">
            <form action={createAppraisalCycleAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="FY26 Mid-year Review" /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="APR-2601" /></div>
              <div className="space-y-2"><Label>Start date</Label><Input name="startDate" type="date" /></div>
              <div className="space-y-2"><Label>End date</Label><Input name="endDate" type="date" /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Create cycle</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "TRAINING":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Create training program" description="Build the learning calendar with compliance and capacity details.">
            <form action={createTrainingProgramAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="POSH refresher" /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="TRN-2401" /></div>
              <div className="space-y-2"><Label>Starts at</Label><Input name="startsAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Ends at</Label><Input name="endsAt" type="datetime-local" /></div>
              <div className="space-y-2"><Label>Trainer</Label><Input name="trainerName" placeholder="Internal HR lead" /></div>
              <div className="space-y-2"><Label>Capacity</Label><Input name="capacity" type="number" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Learning outcomes and expected participation." /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Create program</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Nominate employee" description="Add a learner to the selected training session.">
            <form action={nominateEmployeeAction} className="space-y-4">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Program</Label><Select name="programId"><option value="">Select program</option>{references.programs.map((program) => <option key={program.id} value={program.id}>{program.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Employee</Label><Select name="employeeId"><option value="">Select employee</option>{references.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}</Select></div>
              <FormSubmitButton variant="brand">Nominate employee</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "WORKFLOWS":
      return (
        <FormCard title="Create workflow task" description="Track due dates, reminders, and team work in a single HR operations board.">
          <form action={createInternalTaskAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input name="title" placeholder="Prepare joining kit for new hire" /></div>
            <div className="space-y-2"><Label>Assigned user</Label><Select name="assignedToId"><option value="">Optional assignee</option>{references.users.map((user) => <option key={user.id} value={user.id}>{user.label}</option>)}</Select></div>
            <div className="space-y-2"><Label>Priority</Label><Select name="priority"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></Select></div>
            <div className="space-y-2"><Label>Due at</Label><Input name="dueAt" type="datetime-local" /></div>
            <div className="space-y-2"><Label>Reminder at</Label><Input name="reminderAt" type="datetime-local" /></div>
            <div className="space-y-2"><Label>Lane</Label><Input name="workflowLane" placeholder="New hires / Payroll / Audit" /></div>
            <div className="space-y-2"><Label>Branch</Label><Select name="branchId"><option value="">Optional branch</option>{references.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></div>
            <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Workflow notes, checklist, or dependency details." /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Create task</FormSubmitButton>
          </form>
        </FormCard>
      );

    case "INTEGRATIONS":
      return (
        <FormCard title="Save integration endpoint" description="Register integration-ready service details for future connector rollout.">
          <form action={upsertIntegrationEndpointAction} className="grid gap-4 md:grid-cols-2">
            <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
            <div className="space-y-2"><Label>Provider type</Label><Select name="providerType"><option value="BIOMETRIC">Biometric</option><option value="FACE_RECOGNITION">Face recognition</option><option value="SMS">SMS</option><option value="PAYMENT">Payment</option><option value="WHATSAPP">WhatsApp</option><option value="ERP">ERP</option></Select></div>
            <div className="space-y-2"><Label>Status</Label><Select name="status"><option value="CONFIGURED">Configured</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="ERROR">Error</option></Select></div>
            <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Primary biometric connector" /></div>
            <div className="space-y-2"><Label>Code</Label><Input name="code" placeholder="INT-BIO-01" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Endpoint URL</Label><Input name="endpointUrl" placeholder="https://integration.example.com/webhook" /></div>
            <div className="space-y-2"><Label>Auth type</Label><Input name="authType" placeholder="Bearer token" /></div>
            <div className="space-y-2"><Label>Webhook secret</Label><Input name="webhookSecret" placeholder="Optional secret" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Config JSON</Label><Textarea defaultValue={`{ "timeoutMs": 15000, "retries": 3 }`} name="configJson" /></div>
            <FormSubmitButton className="md:col-span-2" variant="brand">Save endpoint</FormSubmitButton>
          </form>
        </FormCard>
      );

    case "DOCUMENT_VAULT":
      return (
        <div className="grid gap-6 xl:grid-cols-2">
          <FormCard title="Create folder" description="Organize files by tenant, branch, or employee scope.">
            <form action={createDocumentFolderAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="Employee records" /></div>
              <div className="space-y-2"><Label>Slug</Label><Input name="slug" placeholder="employee-records" /></div>
              <div className="space-y-2"><Label>Scope</Label><Select name="scope"><option value="TENANT">Tenant</option><option value="BRANCH">Branch</option><option value="EMPLOYEE">Employee</option><option value="RESTRICTED">Restricted</option></Select></div>
              <div className="space-y-2"><Label>Parent folder</Label><Select name="parentId"><option value="">Root</option>{references.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</Select></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Create folder</FormSubmitButton>
            </form>
          </FormCard>

          <FormCard title="Upload document" description="Store governed documents with folder, expiry, and visibility controls.">
            <form action={uploadVaultDocumentAction} className="grid gap-4 md:grid-cols-2">
              <HiddenFields redirectTo={redirectTo} tenantSlug={tenantSlug} />
              <div className="space-y-2 md:col-span-2"><Label>Folder</Label><Select name="folderId"><option value="">Select folder</option>{references.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</Select></div>
              <div className="space-y-2"><Label>Title</Label><Input name="title" placeholder="Offer letter - April intake" /></div>
              <div className="space-y-2"><Label>Category</Label><Input name="category" placeholder="Offer Letter / Policy / ID" /></div>
              <div className="space-y-2"><Label>Visibility</Label><Select name="visibility"><option value="TENANT">Tenant</option><option value="BRANCH">Branch</option><option value="EMPLOYEE">Employee</option><option value="RESTRICTED">Restricted</option></Select></div>
              <div className="space-y-2"><Label>Expires at</Label><Input name="expiresAt" type="date" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea name="description" placeholder="Renewal note or document context." /></div>
              <div className="space-y-2 md:col-span-2"><Label>File</Label><Input name="file" type="file" /></div>
              <FormSubmitButton className="md:col-span-2" variant="brand">Upload document</FormSubmitButton>
            </form>
          </FormCard>
        </div>
      );

    case "ADVANCED_ANALYTICS":
      return (
        <FormCard title="Live analytics workspace" description="This module is report-driven. Use the export actions above to pull the latest analytics snapshot from live tenant data.">
          <p className="text-sm leading-7 text-slate-600">
            Analytics are generated from the operational modules already configured in this tenant workspace.
            As recruitment, onboarding, helpdesk, assets, appraisal, and training data grows, the overview cards
            and exports on this page will surface richer cross-module reporting automatically.
          </p>
        </FormCard>
      );

    default:
      return null;
  }
}
