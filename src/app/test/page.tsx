// app/test/page.tsx

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TestPage() {
  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Queue Management</CardTitle>
      </CardHeader>

      <CardContent>
        <Button>Create Queue</Button>
      </CardContent>
    </Card>
  );
}