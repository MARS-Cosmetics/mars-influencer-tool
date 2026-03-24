"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarsLogo } from "@/components/mars-logo";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - MARS brand */}
      <div className="hidden w-1/2 flex-col justify-between bg-[#A6192E] p-12 lg:flex">
        <MarsLogo variant="white" className="h-8" />
        <div>
          <h2
            className="text-4xl font-bold leading-tight text-white"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Influencer
            <br />
            Management
            <br />
            System
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70">
            Manage your influencer universe, collaborations, campaigns, and
            content — all in one place.
          </p>
        </div>
        <p className="text-xs text-white/40">
          MARS Cosmetics &middot; Makeup for everyone
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center bg-[#FFEFD2]/30 p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <MarsLogo variant="black" className="h-7" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-black"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Sign in
          </h1>
          <p className="mt-1.5 text-sm text-black/50">
            Enter your credentials to access the dashboard
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-black/70">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@mars.com"
                required
                className="h-10 border-black/15 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-black/70">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-10 border-black/15 bg-white"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-[#A6192E]/10 px-3 py-2 text-sm text-[#A6192E]">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-10 w-full bg-[#A6192E] text-white hover:bg-[#8B1527]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
