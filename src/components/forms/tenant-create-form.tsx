import { TenantType } from "@prisma/client";

import { createTenantAction } from "@/actions/super-admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function TenantCreateForm({
  plans,
  redirectTo,
}: {
  plans: Array<{ id: string; name: string; code: string }>;
  redirectTo: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new tenant workspace</CardTitle>
        <CardDescription>
          Provision the tenant, assign a subscription, and invite the tenant admin with OTP-based
          password setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createTenantAction} className="grid gap-5 lg:grid-cols-2">
          <input name="redirectTo" type="hidden" value={redirectTo} />

          <div className="space-y-2">
            <Label htmlFor="tenant-name">Tenant name</Label>
            <Input id="tenant-name" name="name" placeholder="Apex Education Group" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-slug">Tenant slug</Label>
            <Input id="tenant-slug" name="slug" placeholder="apex-education" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-legal-name">Legal name</Label>
            <Input
              id="tenant-legal-name"
              name="legalName"
              placeholder="Apex Education Private Limited"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-type">Organization type</Label>
            <Select defaultValue={TenantType.COLLEGE_GROUP} id="tenant-type" name="type">
              {Object.values(TenantType).map((tenantType) => (
                <option key={tenantType} value={tenantType}>
                  {tenantType.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-first-name">Tenant admin first name</Label>
            <Input id="admin-first-name" name="adminFirstName" placeholder="Anita" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-last-name">Tenant admin last name</Label>
            <Input id="admin-last-name" name="adminLastName" placeholder="Sharma" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Tenant admin email</Label>
            <Input id="admin-email" name="adminEmail" placeholder="admin@apexedu.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-phone">Tenant admin phone</Label>
            <Input id="admin-phone" name="adminPhone" placeholder="+91 9876543210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Support email</Label>
            <Input id="support-email" name="supportEmail" placeholder="help@apexedu.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" placeholder="https://apexedu.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Custom domain</Label>
            <Input id="domain" name="domain" placeholder="hr.apexedu.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <Input id="subdomain" name="subdomain" placeholder="apexedu" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-year">Session year</Label>
            <Input id="session-year" name="sessionYear" placeholder="2026-2027" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="financial-year">Financial year</Label>
            <Input id="financial-year" name="financialYear" placeholder="2026-2027" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input id="logo-url" name="logoUrl" placeholder="https://cdn.example.com/logo.png" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-file">Logo upload</Label>
            <Input id="logo-file" name="logoFile" type="file" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-id">Subscription plan</Label>
            <Select id="plan-id" name="planId">
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({plan.code})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme-color">Theme color</Label>
            <Input defaultValue="#0f766e" id="theme-color" name="themeColor" type="color" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent color</Label>
            <Input defaultValue="#f59e0b" id="accent-color" name="accentColor" type="color" />
          </div>
          <div className="lg:col-span-2">
            <FormSubmitButton variant="brand">Create tenant workspace</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
