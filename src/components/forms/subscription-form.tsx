import { SubscriptionStatus } from "@prisma/client";

import { updateTenantSubscriptionAction } from "@/actions/super-admin";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function SubscriptionForm({
  tenantId,
  redirectTo,
  currentPlanId,
  currentStatus,
  currentModules,
  plans,
}: {
  tenantId: string;
  redirectTo: string;
  currentPlanId?: string;
  currentStatus?: SubscriptionStatus;
  currentModules?: string[];
  plans: Array<{ id: string; name: string; code: string }>;
}) {
  return (
    <form action={updateTenantSubscriptionAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <input name="tenantId" type="hidden" value={tenantId} />
      <input name="redirectTo" type="hidden" value={redirectTo} />

      <div className="space-y-2">
        <Label>Plan</Label>
        <Select defaultValue={currentPlanId} name="planId">
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} ({plan.code})
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select defaultValue={currentStatus ?? SubscriptionStatus.TRIAL} name="status">
          {Object.values(SubscriptionStatus).map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ends at</Label>
        <Input name="endsAt" type="date" />
      </div>
      <div className="space-y-2 xl:col-span-2">
        <Label>Module overrides</Label>
        <Input
          defaultValue={currentModules?.join(", ")}
          name="moduleOverrides"
          placeholder="EMPLOYEES, SECURITY, REPORTS"
        />
      </div>
      <div className="md:col-span-2 xl:col-span-5">
        <FormSubmitButton size="sm" variant="outline">
          Save subscription
        </FormSubmitButton>
      </div>
    </form>
  );
}
