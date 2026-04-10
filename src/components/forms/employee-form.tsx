import { EmploymentStatus, EmploymentType } from "@prisma/client";

import { createEmployeeAction } from "@/actions/employee";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function EmployeeForm({
  tenantSlug,
  redirectTo,
  colleges,
  branches,
  departments,
  managers,
}: {
  tenantSlug: string;
  redirectTo: string;
  colleges: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  managers: Array<{ id: string; firstName: string; lastName: string | null; employeeCode: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an employee profile</CardTitle>
        <CardDescription>
          Add an employee record mapped to the correct branch, department, and reporting manager.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createEmployeeAction} className="grid gap-5 lg:grid-cols-3">
          <input name="tenantSlug" type="hidden" value={tenantSlug} />
          <input name="redirectTo" type="hidden" value={redirectTo} />

          <div className="space-y-2">
            <Label>Employee code</Label>
            <Input name="employeeCode" placeholder="EMP-1001" />
          </div>
          <div className="space-y-2">
            <Label>First name</Label>
            <Input name="firstName" placeholder="Riya" />
          </div>
          <div className="space-y-2">
            <Label>Last name</Label>
            <Input name="lastName" placeholder="Verma" />
          </div>
          <div className="space-y-2">
            <Label>College or unit</Label>
            <Select name="collegeId">
              <option value="">Optional</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Branch or campus</Label>
            <Select name="branchId">
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select name="departmentId">
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reporting manager</Label>
            <Select name="managerId">
              <option value="">Optional</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {[manager.firstName, manager.lastName].filter(Boolean).join(" ")} ({manager.employeeCode})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Job title</Label>
            <Input name="jobTitle" placeholder="Senior HR Executive" />
          </div>
          <div className="space-y-2">
            <Label>Employment type</Label>
            <Select defaultValue={EmploymentType.FULL_TIME} name="employmentType">
              {Object.values(EmploymentType).map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select defaultValue={EmploymentStatus.ACTIVE} name="status">
              {Object.values(EmploymentStatus).map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Join date</Label>
            <Input name="joinDate" type="date" />
          </div>
          <div className="space-y-2">
            <Label>Salary</Label>
            <Input name="salary" placeholder="850000" type="number" />
          </div>
          <div className="space-y-2">
            <Label>Work email</Label>
            <Input name="workEmail" placeholder="riya.verma@company.com" />
          </div>
          <div className="space-y-2">
            <Label>Personal email</Label>
            <Input name="personalEmail" placeholder="riya@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="phone" placeholder="+91 9123456789" />
          </div>
          <div className="space-y-2">
            <Label>Profile photo</Label>
            <Input name="profilePhoto" type="file" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>Supporting documents</Label>
            <Input multiple name="documents" type="file" />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <Label>Qualification summary</Label>
            <Textarea name="qualificationSummary" placeholder="Degrees, certifications, or onboarding credentials." />
          </div>
          <div className="lg:col-span-3">
            <FormSubmitButton variant="brand">Create employee profile</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
