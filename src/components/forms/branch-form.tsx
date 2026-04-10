import { BranchType } from "@prisma/client";

import { createBranchAction } from "@/actions/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function BranchForm({
  tenantSlug,
  redirectTo,
  colleges,
}: {
  tenantSlug: string;
  redirectTo: string;
  colleges: Array<{ id: string; name: string; code: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a branch or campus</CardTitle>
        <CardDescription>
          Extend the organization structure with campuses, branch offices, or field units.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createBranchAction} className="grid gap-5 md:grid-cols-2">
          <input name="tenantSlug" type="hidden" value={tenantSlug} />
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <div className="space-y-2">
            <Label>College or unit</Label>
            <Select name="collegeId">
              <option value="">Select a college or unit</option>
              {colleges.map((college) => (
                <option key={college.id} value={college.id}>
                  {college.name} ({college.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Branch name</Label>
            <Input name="name" placeholder="South Campus" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input name="code" placeholder="SC01" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue={BranchType.MAIN_CAMPUS} name="type">
              {Object.values(BranchType).map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" placeholder="southcampus@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="phone" placeholder="+91 9988776655" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Address</Label>
            <Input name="address" placeholder="Campus or branch address" />
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton variant="brand">Create branch or campus</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
