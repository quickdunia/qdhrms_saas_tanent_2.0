import { createDepartmentAction } from "@/actions/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function DepartmentForm({
  tenantSlug,
  redirectTo,
  branches,
}: {
  tenantSlug: string;
  redirectTo: string;
  branches: Array<{ id: string; name: string; code: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a department</CardTitle>
        <CardDescription>
          Define the department structure within a selected branch or campus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createDepartmentAction} className="grid gap-5 md:grid-cols-2">
          <input name="tenantSlug" type="hidden" value={tenantSlug} />
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <div className="space-y-2">
            <Label>Branch or campus</Label>
            <Select name="branchId">
              <option value="">Select a branch or campus</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department name</Label>
            <Input name="name" placeholder="Human Resources" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input name="code" placeholder="HR" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea name="description" placeholder="Department responsibilities and scope." />
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton variant="brand">Create department</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
