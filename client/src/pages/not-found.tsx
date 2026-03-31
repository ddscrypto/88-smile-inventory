import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="p-4 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The page you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button data-testid="button-go-home">Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
