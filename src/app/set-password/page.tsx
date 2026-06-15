"use client";

import { FormEvent, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-sm text-green-700">Password set successfully. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-charcoal placeholder:text-stone/60 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          placeholder="At least 8 characters"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-charcoal mb-1">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="block w-full rounded-md border border-stone/30 bg-white px-3 py-2 text-charcoal placeholder:text-stone/60 focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-clay px-4 py-2.5 text-sm font-semibold text-white hover:bg-clay/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Setting password..." : "Set password"}
      </button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate">Set Your Password</h1>
          <p className="mt-2 text-sm text-stone">Choose a password for your Lone Star Portal account</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-stone/10">
          <Suspense fallback={<div className="h-48" />}>
            <SetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
