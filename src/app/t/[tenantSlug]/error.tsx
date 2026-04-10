"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TenantError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unable to load this workspace</CardTitle>
        <CardDescription>
          The tenant dashboard hit an unexpected issue. You can retry without losing your current session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => reset()} variant="brand">
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
