import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import {
  Button,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSection,
} from "@raydenui/ui";
import { chartIcon, homeIcon, listIcon, signOutIcon, videoIcon } from "@raydenui/ui/icons";
import { socket } from "../api/client";
import { useAuth } from "../context/AuthContext";

const links = [
  { path: "/", label: "Dashboard", icon: homeIcon },
  { path: "/monitor", label: "Live Monitor", icon: videoIcon },
  { path: "/detections", label: "Detections", icon: listIcon },
  { path: "/eggs", label: "Egg Quality", icon: chartIcon },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl" aria-hidden="true">
        🦆
      </span>
      <div>
        <div className="font-heading text-h6 text-grey-900">AI-TIK</div>
        <div className="text-body-xs text-grey-500">Duck Reproductive Monitoring</div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
    if (value === "logout") logout();
    else navigate(value);
  };

  return (
    <aside className="md:sticky md:top-0 md:h-screen md:p-4 md:shrink-0">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-grey-200">
        <Brand />
        <Button
          variant="grey"
          appearance="outlined"
          size="sm"
          iconPosition="icon-only"
          icon={menuOpen ? <X size={18} /> : <Menu size={18} />}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        />
      </div>

      <SidebarMenu
        value={pathname}
        onValueChange={handleSelect}
        className={`${menuOpen ? "flex" : "hidden"} md:flex w-full md:w-[272px] md:h-full rounded-none md:rounded-xl border-b md:border border-grey-200 md:shadow-soft-xs`}
      >
        <div className="hidden md:block px-2 pb-2">
          <Brand />
        </div>

        <SidebarMenuSection title="MAIN MENU">
          {links.map((link) => (
            <SidebarMenuItem key={link.path} value={link.path} icon={link.icon}>
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
            <SidebarMenuItem value="logout" icon={signOutIcon}>
              Log out
            </SidebarMenuItem>
          </SidebarMenuSection>
        </div>
      </SidebarMenu>
    </aside>
  );
}
