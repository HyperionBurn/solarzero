"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function getPasswordStrength(password: string) {
  if (!password) {
    return { label: "Enter a password", color: "bg-muted", width: "0%" };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { label: "Weak", color: "bg-rose-500", width: "25%" };
  if (score === 2) return { label: "Fair", color: "bg-amber-500", width: "50%" };
  if (score === 3) return { label: "Good", color: "bg-teal-500", width: "75%" };
  return { label: "Strong", color: "bg-emerald-500", width: "100%" };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Please enter your full name.";
    if (!email.includes("@") || !email.includes(".")) errors.email = "Enter a valid email address.";
    if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }
      router.replace(`/login?registered=true&email=${encodeURIComponent(email)}`);
      router.refresh();
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed because the server did not respond cleanly.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Get started with SolarZero and start verifying UAE rooftops faster.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && <div role="alert" className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: "" })); }}
              autoComplete="name"
              required
              disabled={loading}
            />
            {fieldErrors.name && <p role="alert" className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: "" })); }}
              autoComplete="email"
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
                 type={showPassword ? "text" : "password"}
                 placeholder="********"
                 value={password}
                 onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: "" })); }}
                 autoComplete="new-password"
                 required
                 minLength={8}
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
            {password && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full transition-all ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Password strength: <span className="font-medium text-foreground">{passwordStrength.label}</span>. Use 8+ characters with a number and symbol for a stronger sign-in.
                </p>
              </div>
            )}
            {fieldErrors.password && <p role="alert" className="text-xs text-destructive">{fieldErrors.password}</p>}
           </div>
           <div className="space-y-2">
             <Label htmlFor="confirmPassword">Confirm Password</Label>
             <div className="relative">
               <Input
                 id="confirmPassword"
                 type={showConfirmPassword ? "text" : "password"}
                 placeholder="********"
                 value={confirmPassword}
                 onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: "" })); }}
                 autoComplete="new-password"
                 required
                 disabled={loading}
                 className="pr-10"
               />
               <button
                 type="button"
                 onClick={() => setShowConfirmPassword((current) => !current)}
                 aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                 className="absolute inset-y-0 right-2 flex items-center text-muted-foreground transition-colors hover:text-foreground"
               >
                 {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </button>
             </div>
            {fieldErrors.confirmPassword && <p role="alert" className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading || !name || !email || !password || !confirmPassword}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            You&apos;ll receive a verification email before your first sign-in.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
