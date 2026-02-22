import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-4">
      <div className="space-y-3">
        <div className="flex justify-center">
          <Link href="/dashboard" aria-label="Open library">
            <AppLogo priority />
          </Link>
        </div>
        <AuthForm mode="login" />
        <p className="text-sm text-muted-foreground">
          No account yet? <Link className="underline" href="/auth/register">Create one</Link>
        </p>
      </div>
    </main>
  );
}
