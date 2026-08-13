import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-sans font-bold">404 — Page Not Found</h2>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild variant="outline" className="border-primary/20 text-primary">
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
