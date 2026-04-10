"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Unable to load the super admin console</CardTitle>
        <CardDescription>
          The platform command center ran into an unexpected issue. Retry to continue safely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => reset()} variant="brand">
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
