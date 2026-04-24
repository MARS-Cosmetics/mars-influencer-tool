"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { NotificationsPanel } from "@/components/notifications-panel";
import { LogOut, Bell } from "lucide-react";

export function Header() {
  const { data: session } = useSession();
  const [hasUnread] = useState(true);

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "?";

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600">
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#A6192E] ring-2 ring-white" />
            )}
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-auto p-0">
            <NotificationsPanel />
          </PopoverContent>
        </Popover>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-3 pr-1 outline-none transition-colors hover:bg-zinc-50">
              <div className="text-right">
                <p className="text-sm font-medium leading-none text-zinc-900">
                  {session.user.name}
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-zinc-500">
                  {session.user.role}
                </p>
              </div>
              <Avatar className="h-8 w-8 border border-zinc-200">
                <AvatarFallback className="bg-[#A6192E] text-[11px] font-medium text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-zinc-500">{session.user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
