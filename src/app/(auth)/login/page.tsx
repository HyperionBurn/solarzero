"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailFromQuery = searchParams.get("email") ?? "";
  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl = callbackUrlParam && callbackUrlParam.startsWith("/") ? callbackUrlParam : "/opportunities";
  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => {
    const authError = searchParams.get("error");
    if (authError === "missing_token") return "Verification link is missing.";
    if (authError === "invalid_token") return "Verification link is invalid or expired.";
    if (authError === "verification_failed") return "Verification failed. Please try again.";
    if (authError === "SessionRequired") return "Please sign in to continue.";
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [success] = useState(() => {
    if (searchParams.get("verified") === "true") {
      return emailFromQuery
        ? `Email verified for ${emailFromQuery}. Sign in once and we will open your opportunity workspace.`
        : "Email verified. Sign in once and we will open your opportunity workspace.";
    }
    if (searchParams.get("registered") === "true") {
      return emailFromQuery
        ? `Registration successful for ${emailFromQuery}. Please verify your email before signing in.`
        : "Registration successful. Please verify your email before signing in.";
    }
    if (searchParams.get("signedOut") === "true") {
      return "You have been signed out safely.";
    }
    return "";
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!email.includes("@") || !email.includes(".")) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        redirectTo: callbackUrl,
      });

      if (!result || !result.ok || result.error || !result.url) {
        if (result?.error === "CredentialsSignin" || result?.error?.includes("CredentialsSignin")) {
          const refinedStatus = await getLoginStatus(email);
          setError(
            refinedStatus === "unverified"
              ? "This email is registered but not verified yet. Open the verification email, then sign in here."
              : "Invalid email or password. Check the email, password, and verification email before trying again.",
          );
        } else {
          setError(result?.error || "Login failed. Please try again in a moment.");
        }
      } else {
        const destination = result.url;
        router.replace(destination);
        router.refresh();
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed because the server did not respond cleanly. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              required
              disabled={loading}
            />
            {fieldErrors.email && <p role="alert" className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: "" }));
                }}
                required
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 flex items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && <p role="alert" className="text-xs text-destructive">{fieldErrors.password}</p>}
          </div>
          {success && (
            <div role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              {success}
            </div>
          )}
          {error && <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">Register</Link>
        </p>
      </CardContent>
    </Card>
  );
}

async function getLoginStatus(email: string) {
  try {
    const response = await fetch("/api/auth/login-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok && response.status !== 429) {
      return "continue";
    }

    const data = (await response.json()) as { status?: string };
    return data.status === "unverified" ? "unverified" : "continue";
  } catch {
    return "continue";
  }
}
