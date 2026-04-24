"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [lastChanged, setLastChanged] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLastChange() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.lastPasswordChange) {
            setLastChanged(data.lastPasswordChange);
          }
        }
      } catch {
        // Silently ignore - the field is optional
      }
    }
    fetchLastChange();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{session?.user?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{session?.user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <Badge variant="secondary" className="capitalize">
                {session?.user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Change Password</p>
              {lastChanged ? (
                <p className="text-sm text-gray-500">
                  Last changed:{" "}
                  {new Date(lastChanged).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Update your password regularly to keep your account secure
                </p>
              )}
            </div>
            <Link href="/change-password">
              <Button variant="outline">Change Password</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Application</p>
              <p className="font-medium">MARS Influencer Management System</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-gray-500">Integrations (Coming Soon)</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">Business Central</Badge>
              <Badge variant="outline">Shopify</Badge>
              <Badge variant="outline">CultureX</Badge>
              <Badge variant="outline">Instagram API</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
