import { CollegeType } from "@prisma/client";

import { createCollegeAction } from "@/actions/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function CollegeForm({
  tenantSlug,
  redirectTo,
}: {
  tenantSlug: string;
  redirectTo: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a college or unit</CardTitle>
        <CardDescription>
          Create the first level of the organization hierarchy for this tenant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createCollegeAction} className="grid gap-5 md:grid-cols-2">
          <input name="tenantSlug" type="hidden" value={tenantSlug} />
          <input name="redirectTo" type="hidden" value={redirectTo} />
          <div className="space-y-2">
            <Label>Name</Label>
            <Input name="name" placeholder="Central Engineering College" />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input name="code" placeholder="CEC" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select defaultValue={CollegeType.COLLEGE} name="type">
              {Object.values(CollegeType).map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" placeholder="college@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="phone" placeholder="+91 9876543210" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input name="address" placeholder="Main city campus address" />
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton variant="brand">Create college or unit</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
