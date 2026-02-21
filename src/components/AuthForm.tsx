"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-client";

type Props = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    if (mode === "register" && data.requiresEmailConfirmation) {
      setInfo("Account created. Please confirm your email, then sign in.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function continueWithGoogle() {
    setOauthLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });

    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Sign in" : "Create account"}</CardTitle>
        <CardDescription>Email + password, or continue with Google.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="grid gap-2 text-sm">
            Email
            <input
              required
              type="email"
              maxLength={120}
              className="h-10 rounded-md border border-border bg-card px-3"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="reader@example.com"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Password
            <input
              required
              type="password"
              minLength={6}
              maxLength={100}
              className="h-10 rounded-md border border-border bg-card px-3"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}

          <Button type="submit" className="w-full" disabled={loading || oauthLoading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <div className="text-center text-xs text-muted-foreground">or</div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading || oauthLoading}
            onClick={continueWithGoogle}
          >
            {oauthLoading ? "Redirecting to Google..." : "Continue with Google"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
