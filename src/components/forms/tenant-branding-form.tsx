import { updateTenantBrandingAction } from "@/actions/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TenantProfile = {
  slug: string;
  name: string;
  legalName: string | null;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  supportEmail: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  timezone: string;
  currency: string;
  locale: string;
  themeColor: string;
  accentColor: string;
};

export function TenantBrandingForm({
  tenant,
  redirectTo,
}: {
  tenant: TenantProfile;
  redirectTo: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding and organization profile</CardTitle>
        <CardDescription>
          Update the tenant identity, theme colors, contact profile, and regional preferences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={updateTenantBrandingAction} className="grid gap-5 lg:grid-cols-2">
          <input name="tenantSlug" type="hidden" value={tenant.slug} />
          <input name="redirectTo" type="hidden" value={redirectTo} />

          <div className="space-y-2">
            <Label htmlFor="tenant-profile-name">Display name</Label>
            <Input defaultValue={tenant.name} id="tenant-profile-name" name="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-legal-name">Legal name</Label>
            <Input
              defaultValue={tenant.legalName ?? ""}
              id="tenant-profile-legal-name"
              name="legalName"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-tagline">Tagline</Label>
            <Input defaultValue={tenant.tagline ?? ""} id="tenant-profile-tagline" name="tagline" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-support-email">Support email</Label>
            <Input
              defaultValue={tenant.supportEmail ?? ""}
              id="tenant-profile-support-email"
              name="supportEmail"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-website">Website</Label>
            <Input defaultValue={tenant.website ?? ""} id="tenant-profile-website" name="website" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-logo-url">Logo URL</Label>
            <Input defaultValue={tenant.logoUrl ?? ""} id="tenant-profile-logo-url" name="logoUrl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-logo-file">Logo upload</Label>
            <Input id="tenant-profile-logo-file" name="logoFile" type="file" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-phone">Phone</Label>
            <Input defaultValue={tenant.phone ?? ""} id="tenant-profile-phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-address-line-1">Address line 1</Label>
            <Input
              defaultValue={tenant.addressLine1 ?? ""}
              id="tenant-profile-address-line-1"
              name="addressLine1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-address-line-2">Address line 2</Label>
            <Input
              defaultValue={tenant.addressLine2 ?? ""}
              id="tenant-profile-address-line-2"
              name="addressLine2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-city">City</Label>
            <Input defaultValue={tenant.city ?? ""} id="tenant-profile-city" name="city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-state">State</Label>
            <Input defaultValue={tenant.state ?? ""} id="tenant-profile-state" name="state" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-country">Country</Label>
            <Input defaultValue={tenant.country ?? ""} id="tenant-profile-country" name="country" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-postal-code">Postal code</Label>
            <Input
              defaultValue={tenant.postalCode ?? ""}
              id="tenant-profile-postal-code"
              name="postalCode"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-timezone">Timezone</Label>
            <Input defaultValue={tenant.timezone} id="tenant-profile-timezone" name="timezone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-currency">Currency</Label>
            <Input defaultValue={tenant.currency} id="tenant-profile-currency" name="currency" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-locale">Locale</Label>
            <Input defaultValue={tenant.locale} id="tenant-profile-locale" name="locale" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-theme-color">Theme color</Label>
            <Input
              defaultValue={tenant.themeColor}
              id="tenant-profile-theme-color"
              name="themeColor"
              type="color"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-profile-accent-color">Accent color</Label>
            <Input
              defaultValue={tenant.accentColor}
              id="tenant-profile-accent-color"
              name="accentColor"
              type="color"
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="tenant-profile-description">Organization profile</Label>
            <Textarea
              defaultValue={tenant.description ?? ""}
              id="tenant-profile-description"
              name="description"
              placeholder="Describe the organization, culture, or operating model."
            />
          </div>
          <div className="lg:col-span-2">
            <FormSubmitButton variant="brand">Save tenant settings</FormSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
