"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus, Search, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { INDIAN_STATES } from "@/lib/constants";
import { getCitiesForState } from "@/lib/indian-cities";

interface Agency {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isActive: boolean;
  _count: {
    influencers: number;
  };
}

type FilterKey = "state" | "city" | "status" | "pincode";

const ALL_FILTERS: { key: FilterKey; label: string }[] = [
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
  { key: "pincode", label: "Pincode" },
];

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pincodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs to avoid stale closures in debounced handlers
  const filtersRef = useRef({ stateFilter, cityFilter, statusFilter, pincodeFilter });
  filtersRef.current = { stateFilter, cityFilter, statusFilter, pincodeFilter };
  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchAgencies = useCallback(
    async (s: string, state: string, city: string, status: string, pincode: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (s) params.set("search", s);
        if (state) params.set("state", state);
        if (city) params.set("city", city);
        if (status) params.set("status", status);
        if (pincode) params.set("pincode", pincode);
        const res = await fetch(`/api/agencies?${params.toString()}`);
        if (res.ok) setAgencies(await res.json());
      } catch (error) {
        console.error("Failed to fetch agencies:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Single effect: fetch on mount + refetch when any dropdown filter changes
  useEffect(() => {
    fetchAgencies(searchRef.current, stateFilter, cityFilter, statusFilter, pincodeFilter);
  }, [stateFilter, cityFilter, statusFilter, pincodeFilter, fetchAgencies]);

  // Debounced search (uses refs so it always reads latest filter values)
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const f = filtersRef.current;
      fetchAgencies(value, f.stateFilter, f.cityFilter, f.statusFilter, f.pincodeFilter);
    }, 300);
  };

  // Debounced pincode (uses refs so it always reads latest values)
  const handlePincodeChange = (value: string) => {
    setPincodeFilter(value);
    if (pincodeDebounceRef.current) clearTimeout(pincodeDebounceRef.current);
    pincodeDebounceRef.current = setTimeout(() => {
      const f = filtersRef.current;
      fetchAgencies(searchRef.current, f.stateFilter, f.cityFilter, f.statusFilter, value);
    }, 300);
  };

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (pincodeDebounceRef.current) clearTimeout(pincodeDebounceRef.current);
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

  // State change resets city
  const handleStateChange = (value: string) => {
    setStateFilter(value);
    setCityFilter("");
  };

  // Add a filter
  const addFilter = (key: FilterKey) => {
    setActiveFilters((prev) => [...prev, key]);
    setMenuOpen(false);
  };

  // Remove a filter, clear its value, and auto-remove city if state is removed
  const removeFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      let next = prev.filter((k) => k !== key);
      // Removing state also removes city since city depends on state
      if (key === "state") next = next.filter((k) => k !== "city");
      return next;
    });

    if (key === "state") { setStateFilter(""); setCityFilter(""); }
    if (key === "city") setCityFilter("");
    if (key === "status") setStatusFilter("");
    if (key === "pincode") setPincodeFilter("");
  };

  // Filters available in the + menu
  const remainingFilters = ALL_FILTERS.filter(
    (f) => !activeFilters.includes(f.key)
  );

  // Cities cascade from state
  const cities = stateFilter ? getCitiesForState(stateFilter) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agencies</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading..."
              : `${agencies.length} agenc${agencies.length !== 1 ? "ies" : "y"} found`}
          </p>
        </div>
        <Link href="/agencies/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            New Agency
          </Button>
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search - always visible */}
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search agencies..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Active filters */}
        {activeFilters.map((key) => (
          <div key={key} className="flex items-center gap-1">
            {key === "state" && (
              <>
                <input
                  list="agency-state-options"
                  value={stateFilter}
                  onChange={(e) => handleStateChange(e.target.value)}
                  placeholder="Type or select state..."
                  className={selectClass + " w-[180px]"}
                />
                <datalist id="agency-state-options">
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </>
            )}

            {key === "city" && (
              <>
                <input
                  list="agency-city-options"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  disabled={!stateFilter || !activeFilters.includes("state")}
                  placeholder={
                    stateFilter && activeFilters.includes("state")
                      ? "Type or select city..."
                      : "Add State first"
                  }
                  className={
                    selectClass + " w-[180px]" +
                    (!stateFilter || !activeFilters.includes("state")
                      ? " opacity-50 cursor-not-allowed"
                      : "")
                  }
                />
                <datalist id="agency-city-options">
                  {cities.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}

            {key === "status" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            )}

            {key === "pincode" && (
              <Input
                placeholder="Enter pincode"
                value={pincodeFilter}
                onChange={(e) => handlePincodeChange(e.target.value)}
                className="h-8 w-[130px] text-sm"
                maxLength={6}
              />
            )}

            <button
              type="button"
              onClick={() => removeFilter(key)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {/* + button */}
        {remainingFilters.length > 0 && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 items-center gap-1 rounded-lg border border-dashed border-input px-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Plus className="size-3.5" />
              Filter
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border bg-popover p-1 shadow-md">
                {remainingFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => addFilter(f.key)}
                    className="flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Influencers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : agencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No agencies found.
                </TableCell>
              </TableRow>
            ) : (
              agencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell>
                    <Link
                      href={`/agencies/${agency.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {agency.name}
                    </Link>
                  </TableCell>
                  <TableCell>{agency.contactPerson || "-"}</TableCell>
                  <TableCell>{agency.email || "-"}</TableCell>
                  <TableCell>{agency.phone || "-"}</TableCell>
                  <TableCell>{agency.city || "-"}</TableCell>
                  <TableCell>{agency._count.influencers}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        agency.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {agency.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
