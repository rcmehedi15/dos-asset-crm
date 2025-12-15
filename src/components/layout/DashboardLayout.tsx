import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  PlusCircle,
  Menu,
  X,
  BarChart3,
  ListChecks,
  CheckSquare,
  MessageSquare,
  Settings,
  Bell,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "./DashboardHeader";

const getNavigation = (userRole: string | null) => {
  const baseNav = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Entry New Lead", href: "/leads/new", icon: PlusCircle },
    { name: "Notices", href: "/notices", icon: Bell },
  ];

  if (userRole === "salesman") {
    return [
      ...baseNav,
      { name: "Lead List", href: "/lead-list", icon: ListChecks },
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
    ];
  }

  // Admin and digital_marketer navigation
  const managerNav = [
    ...baseNav,
    { name: "Lead Distribution", href: "/lead-distribution", icon: Users },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Messenger", href: "/messenger", icon: MessageSquare },
  ];

  // Only admin gets Users management
  if (userRole === "admin") {
    managerNav.push({ name: "Users", href: "/users", icon: Users });
  }

  return managerNav;
};

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { userRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = getNavigation(userRole);
  const showSettings = userRole === "admin" || userRole === "digital_marketer";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-200 ease-in-out lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <img src="/favicon.ico" alt="Logo" className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground"> ASSET DEVELOPMENT </h1>
                <p className="text-xs text-muted-foreground">Real Estate CRM</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Settings at bottom for admin/digital_marketer */}
          {showSettings && (
            <div className="p-4 border-t border-border">
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  location.pathname === "/settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Settings</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main content area with header */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};