"use client";

import {
  ChartArea,
  ChevronsUpDown,
  HandCoins,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShelvingUnit,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { SidebarIconKey } from "@/features/sidebarSlice";
import { useAppSelector } from "@/store/hook";

const navIconMap: Partial<Record<SidebarIconKey, LucideIcon>> = {
  layoutDashboard: LayoutDashboard,
  shelvingUnit: ShelvingUnit,
  handCoins: HandCoins,
  user: User,
  chartArea: ChartArea,
  settings: Settings,
};

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const sidebar = useAppSelector((state) => state.sidebar);
  const router = useRouter();
  const activeTeam = teams[0];

  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {React.createElement(activeTeam.logo, { className: "h-4 w-4" })}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeTeam.name}</span>
                <span className="truncate text-xs">{activeTeam.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  {React.createElement(activeTeam.logo, {
                    className: "h-4 w-4",
                  })}
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span>{activeTeam.name}</span>
                  <span className="text-xs">{activeTeam.plan}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sidebar.navMain?.map((item) => (
              <DropdownMenuItem
                key={item.title}
                onClick={() => router.push(item.url)}
                className="gap-2 p-2"
              >
                {item.icon &&
                  navIconMap[item.icon] &&
                  React.createElement(
                    navIconMap[item.icon] as React.ElementType,
                    {
                      className: "size-4",
                    },
                  )}
                {item.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
