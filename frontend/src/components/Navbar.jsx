import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Camera, Egg, House, List, LogOut, Moon, Sun } from "lucide-react";
import {
  Button,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSection,
} from "@raydenui/ui";
import { chartIcon, homeIcon, listIcon, signOutIcon, videoIcon } from "@raydenui/ui/icons";
import { socket } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const links = [
  { path: "/", label: "Dashboard", short: "Dashboard", icon: homeIcon, MobileIcon: House },
  { path: "/monitor", label: "Live Monitor", short: "Monitor", icon: videoIcon, MobileIcon: Camera },
  { path: "/detections", label: "Detections", short: "Detections", icon: listIcon, MobileIcon: List },
  { path: "/eggs", label: "Egg Quality", short: "Eggs", icon: chartIcon, MobileIcon: Egg },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-100 ring-1 ring-success-200 text-2xl"
        aria-hidden="true"
      >
        🦆
      </span>
      <div className="min-w-0">
        <div className="font-heading text-h6 text-grey-900">
          AI-<span className="text-success-600">TIK</span>
        </div>
        <div className="text-body-xs text-grey-500 truncate">
          Duck Reproductive Monitoring
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="grey"
      appearance="outlined"
      size="sm"
      iconPosition="icon-only"
      icon={dark ? <Sun size={18} /> : <Moon size={18} />}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      onClick={toggleTheme}
      className="size-11 shrink-0"
    />
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  const handleSelect = (value) => {
    if (value === "logout") logout();
    else navigate(value);
  };

  return (
    <>
      {/* Below lg: slim top bar plus a fixed bottom nav. */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-surface border-b border-grey-200">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="grey"
            appearance="outlined"
            size="sm"
            iconPosition="icon-only"
            icon={<LogOut size={18} />}
            aria-label="Log out"
            title="Log out"
            onClick={logout}
            className="size-11 shrink-0"
          />
        </div>
      </header>

      <nav
        aria-label="Main navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 bg-surface border-t border-grey-200 pb-[env(safe-area-inset-bottom)]"
      >
        {links.map(({ path, short, MobileIcon }) => {
          const active = path === pathname;
          return (
            <Link
              key={path}
              to={path}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline ${active ? "text-success-600" : "text-grey-500"}`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-success-50" : ""}`}
              >
                <MobileIcon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
              </span>
              {short}
            </Link>
          );
        })}
      </nav>

      {/* lg and up: the sidebar. */}
      <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:p-4">
        <SidebarMenu
          value={pathname}
          onValueChange={handleSelect}
          className="h-full w-[272px] border border-grey-200 shadow-soft-xs"
        >
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <Brand />
            <ThemeToggle />
          </div>

          <SidebarMenuSection title="MAIN MENU">
            {links.map((link) => (
              <SidebarMenuItem
                key={link.path}
                value={link.path}
                icon={link.icon}
                aria-current={link.path === pathname ? "page" : undefined}
                className={
                  link.path === pathname
                    ? "min-h-11 bg-success-50 border-success-500 text-success-700 [&>span:first-child]:text-success-600"
                    : "min-h-11"
                }
              >
                {link.label}
              </SidebarMenuItem>
            ))}
          </SidebarMenuSection>

          <div className="mt-auto space-y-3">
            <div className="flex items-center gap-2 px-3 text-body-xs text-grey-500">
              <span
                className={`w-2 h-2 rounded-full ${connected ? "bg-success-400 animate-pulse" : "bg-error-400"}`}
              />
              {connected ? "Backend connected" : "Backend offline"}
            </div>
            <SidebarMenuSection>
              <SidebarMenuItem value="logout" icon={signOutIcon} className="min-h-11">
                Log out
              </SidebarMenuItem>
            </SidebarMenuSection>
          </div>
        </SidebarMenu>
      </aside>
    </>
  );
}
