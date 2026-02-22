import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-4">
      <div className="space-y-3">
        <div className="flex justify-center">
          <Link href="/dashboard" aria-label="Open library">
            <AppLogo priority />
          </Link>
        </div>
        <AuthForm mode="register" />
        <p className="text-sm text-muted-foreground">
          Already have an account? <Link className="underline" href="/auth/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
