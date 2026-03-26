"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, Trash2, Plus, Loader2 } from "lucide-react";

interface AllowedDomain {
  id: string;
  domain: string;
  isActive: boolean;
  createdAt: string;
}

export default function AllowedDomainsPage() {
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      const res = await fetch("/api/allowed-domains");
      if (!res.ok) throw new Error("Failed to fetch domains");
      const data = await res.json();
      setDomains(data);
    } catch {
      toast.error("Failed to load allowed domains");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const isValidDomain = (domain: string) => {
    const trimmed = domain.trim();
    return (
      trimmed.length > 0 &&
      trimmed.includes(".") &&
      !trimmed.includes("@") &&
      !trimmed.includes(" ")
    );
  };

  const handleAdd = async () => {
    const trimmed = newDomain.trim().toLowerCase();

    if (!isValidDomain(trimmed)) {
      toast.error(
        "Invalid domain format. Must contain a dot, no spaces or @ symbol."
      );
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/allowed-domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add domain");
      }

      toast.success(`Domain "${trimmed}" added successfully`);
      setNewDomain("");
      fetchDomains();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, domain: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/allowed-domains/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove domain");
      }

      toast.success(`Domain "${domain}" removed`);
      fetchDomains();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove domain"
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Allowed Email Domains</h1>
        <p className="mt-1 text-sm text-gray-500">
          Only users with email addresses from these domains can sign in
        </p>
      </div>

      {/* Add domain form */}
      <Card>
        <CardContent className="flex items-center gap-3 pt-6">
          <Input
            placeholder="example.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="max-w-sm"
          />
          <Button onClick={handleAdd} disabled={adding || !newDomain.trim()}>
            {adding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add
          </Button>
        </CardContent>
      </Card>

      {/* Domain list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">
              No domains configured. All email domains are currently allowed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{d.domain}</p>
                    <p className="text-xs text-gray-400">
                      Added{" "}
                      {new Date(d.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => handleRemove(d.id, d.domain)}
                  disabled={removingId === d.id}
                >
                  {removingId === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
