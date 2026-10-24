"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LABEL_PERAN, menuUntuk, type Peran } from "@/lib/peran";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Ikon disimpan di sini, bukan di peran.ts, agar middleware tidak ikut memuat lucide-react.
const IKON: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/work-orders": ClipboardList,
  "/pelanggan": Users,
  "/inventory": Package,
  "/tim-mekanik": HardHat,
  "/laporan-laba": TrendingUp,
  "/audit-log": ScrollText,
  "/pengguna": UserCog,
  "/setelan": Settings,
};

type Props = { namaBengkel: string; logoUrl: string | null; nama: string; peran: Peran };

export function Sidebar(props: Props) {
  const [menuBuka, setMenuBuka] = useState(false);
  const [terlipat, setTerlipat] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cjm_sidebar_terlipat");
      if (saved !== null) {
        setTerlipat(saved === "true");
      }
    } catch {
      // Abaikan bila localStorage tidak bisa diakses
    }
  }, []);

  function toggleTerlipat() {
    setTerlipat((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cjm_sidebar_terlipat", String(next));
      } catch {
        // Abaikan bila localStorage tidak bisa diakses
      }
      return next;
    });
  }

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-zinc-800/80 bg-[#0c0c12] md:flex transition-[width] duration-300 ease-in-out",
          terlipat ? "w-[72px]" : "w-64",
        )}
      >
        <IsiSidebar {...props} terlipat={terlipat} onToggle={toggleTerlipat} />
      </aside>

      {/* Layar sempit: menu di dalam Sheet */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-[#0c0c12]/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={menuBuka} onOpenChange={setMenuBuka}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Buka menu" className="text-zinc-300 hover:text-primary">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-[#0c0c12] border-r border-zinc-800 p-0 text-white">
              <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
              <IsiSidebar {...props} onPilih={() => setMenuBuka(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={props.logoUrl || "/logo.png?v=2"}
              alt={props.namaBengkel}
              className="size-7 shrink-0 rounded-md object-contain"
            />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm text-white uppercase">{props.namaBengkel}</span>
              <span className="text-[10px] text-zinc-500">Sistem Manajemen Bengkel</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function IsiSidebar({
  namaBengkel,
  logoUrl,
  nama,
  peran,
  onPilih,
  terlipat = false,
  onToggle,
}: Props & {
  onPilih?: () => void;
  terlipat?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function keluar() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const menuList = menuUntuk(peran);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-[#0c0c12] select-none text-zinc-300">
        {/* Bagian Atas: Header Bengkel & Navigasi */}
        <div>
          {/* Header Bar dengan Tombol Toggle */}
          <div
            className={cn(
              "flex items-center border-b border-zinc-800/80 py-3 transition-all",
              terlipat ? "flex-col gap-2.5 px-2" : "justify-between px-4",
            )}
          >
            {terlipat ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || "/logo.png?v=2"}
                  alt={namaBengkel}
                  className="size-8 shrink-0 rounded-md object-contain"
                />
                {onToggle && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="size-8 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        aria-label="Buka Sidebar"
                      >
                        <PanelLeftOpen className="size-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="border border-zinc-800 bg-zinc-950 text-white shadow-xl">
                      Buka Sidebar
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl || "/logo.png?v=2"}
                    alt={namaBengkel}
                    className="size-8 shrink-0 rounded-md object-contain"
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-xs font-bold text-white uppercase tracking-tight">
                      {namaBengkel}
                    </h2>
                    <p className="text-[10px] text-zinc-500 truncate">
                      Sistem Bengkel
                    </p>
                  </div>
                </div>

                {onToggle && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="size-8 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        aria-label="Tutup Sidebar"
                      >
                        <PanelLeftClose className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="border border-zinc-800 bg-zinc-950 text-white shadow-xl">
                      Tutup Sidebar
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>

          {/* Label Menu Section */}
          {!terlipat ? (
            <div className="px-4 pt-4 pb-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Menu
              </span>
            </div>
          ) : (
            <div className="pt-2" />
          )}

          {/* Navigation list */}
          <nav className={cn("space-y-1", terlipat ? "px-2" : "px-3")}>
            {menuList.map((menu) => {
              const Ikon = IKON[menu.href];
              const aktif = pathname === menu.href || pathname.startsWith(`${menu.href}/`);

              const linkItem = (
                <Link
                  key={menu.href}
                  href={menu.href}
                  onClick={onPilih}
                  className={cn(
                    "group relative flex items-center rounded-lg text-xs font-medium transition-colors",
                    terlipat ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                    aktif
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
                  )}
                >
                  <Ikon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      aktif ? "text-primary" : "text-zinc-400 group-hover:text-zinc-200",
                    )}
                  />
                  {!terlipat && (
                    <span className="flex-1 truncate">{menu.label}</span>
                  )}
                </Link>
              );

              if (terlipat) {
                return (
                  <Tooltip key={menu.href}>
                    <TooltipTrigger asChild>{linkItem}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="border border-zinc-800 bg-zinc-950 text-white shadow-xl px-2.5 py-1.5 text-xs font-medium"
                    >
                      {menu.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkItem;
            })}
          </nav>
        </div>

        {/* Bagian Bawah: Profil Pengguna & Keluar */}
        {terlipat ? (
          <div className="flex flex-col items-center gap-2 border-t border-zinc-800/80 bg-[#09090e] p-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex size-9 shrink-0 cursor-default items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white">
                  {nama.slice(0, 2).toUpperCase()}
                  <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-[#09090e]" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="border border-zinc-800 bg-zinc-950 text-white shadow-xl p-2.5">
                <p className="font-semibold text-xs">{nama}</p>
                <p className="text-[10px] text-zinc-400">{LABEL_PERAN[peran]}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
                  onClick={keluar}
                  aria-label="Keluar"
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-xl text-xs">
                Keluar
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="border-t border-zinc-800/80 bg-[#09090e] p-3 space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-2.5">
              <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white">
                {nama.slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-2 ring-[#09090e]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{nama}</p>
                <p className="text-[11px] text-zinc-400">{LABEL_PERAN[peran]}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-xs font-medium text-zinc-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
              onClick={keluar}
            >
              <LogOut className="size-3.5" />
              Keluar
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
