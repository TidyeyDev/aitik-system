import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
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
  { path: "/", label: "Dashboard", icon: homeIcon },
  { path: "/monitor", label: "Live Monitor", icon: videoIcon },
  { path: "/detections", label: "Detections", icon: listIcon },
  { path: "/eggs", label: "Egg Quality", icon: chartIcon },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [connected, setConnected] = useState(socket.connected);
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

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

  // Mobile drawer: Escape closes it, the page behind stays put, and focus
  // moves into the drawer and back to the menu button when it closes.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const menuButton = menuButtonRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      menuButton?.focus();
    };
  }, [menuOpen]);

  const handleSelect = (value) => {
    setMenuOpen(false);
    if (value === "logout") logout();
    else navigate(value);
  };

  return (
    <>
      {/* Below lg: top bar, and the sidebar becomes a slide-over drawer. */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-surface border-b border-grey-200">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            ref={menuButtonRef}
            variant="grey"
            appearance="outlined"
            size="sm"
            iconPosition="icon-only"
            icon={<Menu size={20} />}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
            onClick={() => setMenuOpen(true)}
            className="size-11 shrink-0"
          />
        </div>
      </header>

      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        // Visible instantly on open (so focus can move in); stays visible
        // through the slide-out on close, then hides from tab order.
        className={`fixed inset-y-0 left-0 z-50 w-[288px] max-w-[85vw] p-3 duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-auto lg:max-w-none lg:shrink-0 lg:p-4 lg:visible lg:translate-x-0 lg:transition-none ${menuOpen ? "translate-x-0 visible transition-transform" : "-translate-x-full invisible transition-[transform,visibility]"}`}
      >
        <SidebarMenu
          value={pathname}
          onValueChange={handleSelect}
          className="h-full w-full lg:w-[272px] border border-grey-200 shadow-soft-xs"
        >
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <Brand />
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>
            <Button
              ref={closeButtonRef}
              variant="grey"
              appearance="outlined"
              size="sm"
              iconPosition="icon-only"
              icon={<X size={20} />}
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="size-11 shrink-0 lg:hidden"
            />
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
