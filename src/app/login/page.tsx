"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-charcoal placeholder:text-stone/60 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-charcoal placeholder:text-stone/60 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 focus:outline-none focus:ring-2 focus:ring-clay focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate">Lone Star Portal</h1>
          <p className="mt-2 text-sm text-stone">Sign in to your account</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-stone/10">
          <Suspense fallback={<div className="h-48" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
