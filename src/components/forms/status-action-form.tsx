import { FormSubmitButton } from "@/components/ui/form-submit-button";

export function StatusActionForm({
  action,
  hiddenFields,
  label,
  redirectTo,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  label: string;
  redirectTo: string;
  variant?: "outline" | "secondary" | "brand" | "destructive";
}) {
  return (
    <form action={action}>
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} name={key} type="hidden" value={value} />
      ))}
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <FormSubmitButton size="sm" variant={variant}>
        {label}
      </FormSubmitButton>
    </form>
  );
}
