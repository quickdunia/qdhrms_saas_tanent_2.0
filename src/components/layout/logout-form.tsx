import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutForm() {
  return (
    <form action={logoutAction}>
      <Button size="sm" variant="outline">
        Sign out
      </Button>
    </form>
  );
}
