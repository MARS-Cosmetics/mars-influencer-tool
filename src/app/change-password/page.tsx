"use client";

import { useState, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarsLogo } from "@/components/mars-logo";
import { toast } from "sonner";
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isFirstTime = session?.user?.mustChangePassword === true;

  const requirements = useMemo(
    () => [
      { label: "At least 8 characters", met: newPassword.length >= 8 },
      {
        label: "At least 1 uppercase letter",
        met: /[A-Z]/.test(newPassword),
      },
      {
        label: "At least 1 lowercase letter",
        met: /[a-z]/.test(newPassword),
      },
      { label: "At least 1 number", met: /[0-9]/.test(newPassword) },
    ],
    [newPassword]
  );

  const allRequirementsMet = requirements.every((r) => r.met);
  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        setLoading(false);
        return;
      }

      toast.success("Password changed successfully! Please sign in with your new password.");

      // Sign out and redirect to login — this ensures a completely fresh
      // JWT token is created on next login with mustChangePassword=false
      setTimeout(async () => {
        await signOut({ redirectTo: "/login" });
      }, 1500);
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFEFD2]/30 p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <MarsLogo variant="black" className="h-8" />
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-8 shadow-sm">
          <h1
            className="text-2xl font-bold tracking-tight text-black"
            style={{ fontFamily: "var(--font-bricolage)" }}
          >
            Change Your Password
          </h1>
          {isFirstTime && (
            <p className="mt-1.5 text-sm text-[#A6192E]">
              You must change your password before continuing
            </p>
          )}
          {!isFirstTime && (
            <p className="mt-1.5 text-sm text-black/50">
              Enter your current password and choose a new one
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Current Password */}
            <div className="space-y-2">
              <Label
                htmlFor="currentPassword"
                className="text-sm font-medium text-black/70"
              >
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="h-10 border-black/15 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70"
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label
                htmlFor="newPassword"
                className="text-sm font-medium text-black/70"
              >
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-10 border-black/15 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70"
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {requirements.map((req) => (
                    <div
                      key={req.label}
                      className="flex items-center gap-2 text-xs"
                    >
                      {req.met ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span
                        className={
                          req.met ? "text-emerald-700" : "text-red-600"
                        }
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-black/70"
              >
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-10 border-black/15 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-emerald-600">Passwords match</p>
              )}
            </div>

            {error && (
              <p className="rounded-lg bg-[#A6192E]/10 px-3 py-2 text-sm text-[#A6192E]">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="h-10 w-full bg-[#A6192E] text-white hover:bg-[#8B1527]"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing password...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
