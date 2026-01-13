import { useState } from "react";
import {
  FiHome,
  FiKey,
  FiDollarSign,
  FiUser,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiCpu,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../shared/ThemeToggle";

interface UserSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function UserSidebar({
  activeTab,
  onTabChange,
}: UserSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // Get navigation items based on user role
  const getNavigationItems = () => {
    if (user?.role === "accountant") {
      // For Accountants: Dashboard with invoice graphs, Invoices, Credentials (view-only), AI Features, Profile, Settings
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: FiHome,
          description: "Invoice analytics & graphs",
        },
        {
          id: "invoices",
          label: "Invoice Management",
          icon: FiDollarSign,
          description: "View & manage invoices",
        },
        {
          id: "credentials",
          label: "Credentials",
          icon: FiKey,
          description: "View organization credentials",
        },
        {
          id: "ai-features",
          label: "AI Features",
          icon: FiCpu,
          description: "AI-powered tools & features",
        },
        {
          id: "profile",
          label: "Profile",
          icon: FiUser,
          description: "Personal information",
        },
        {
          id: "settings",
          label: "Settings",
          icon: FiSettings,
          description: "Account settings",
        },
      ];
    } else {
      // For Regular Users: Full access to all features
      return [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: FiHome,
          description: "Personal analytics & overview",
        },
        {
          id: "credentials",
          label: "Credential Management",
          icon: FiKey,
          description: "Add, categorize, share credentials",
        },
        {
          id: "invoices",
          label: "Invoice Management",
          icon: FiDollarSign,
          description: "Upload & manage invoices",
        },
        {
          id: "profile",
          label: "Profile",
          icon: FiUser,
          description: "Personal information",
        },
        {
          id: "settings",
          label: "Settings",
          icon: FiSettings,
          description: "Account settings",
        },
      ];
    }
  };

  const navigationItems = getNavigationItems();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div
      className={`bg-card border-r border-border h-screen transition-all duration-300 relative flex flex-col ${isCollapsed ? "w-16" : "w-64"}`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <h1 className="text-2xl font-bold text-foreground">Atreo</h1>
        )}
        {isCollapsed && (
          <h1 className="text-2xl font-bold text-foreground text-center">A</h1>
        )}
        {!isCollapsed && <ThemeToggle />}
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1">
        <div className="px-3 space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-4 border-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <IconComponent
                  className={`h-5 w-5 ${isCollapsed ? "" : "mr-3"} ${isActive ? "text-primary" : ""}`}
                />
                {!isCollapsed && item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Info with Logout */}
      <div className="border-t border-border mt-auto">
        <div className="p-4">
          {!isCollapsed && user?.role && (
            <div className="mb-3 px-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.role === "admin"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    : user.role === "accountant"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}
              >
                {user.role === "accountant"
                  ? "Accountant"
                  : user.role === "admin"
                    ? "Admin"
                    : "User"}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>
              </div>
              {!isCollapsed && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || "user@atreo.com"}
                  </p>
                </div>
              )}
            </div>

            {/* Logout Button */}
            {isCollapsed ? (
              <button
                onClick={handleLogout}
                className="flex-shrink-0 p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                title="Logout"
              >
                <FiLogOut className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="flex-shrink-0 flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-destructive hover:bg-destructive/10 whitespace-nowrap"
              >
                <FiLogOut className="h-4 w-4 mr-1.5" />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -right-4 transform -translate-y-1/2 bg-card border-2 border-border rounded-full p-1.5 shadow-lg hover:bg-accent transition-all duration-200 z-50"
      >
        {isCollapsed ? (
          <FiChevronRight className="h-4 w-4 text-foreground" />
        ) : (
          <FiChevronLeft className="h-4 w-4 text-foreground" />
        )}
      </button>
    </div>
  );
}
