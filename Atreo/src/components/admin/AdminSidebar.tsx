import { useState } from 'react';
import {
  FiBarChart,
  FiUsers,
  FiDollarSign,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiSettings,
  FiZap,
  FiBriefcase,
  FiFileText,
  FiFolder,
  FiShield,
  FiActivity,
  FiHelpCircle,
  FiPlayCircle,
  FiKey,
  FiMail
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../shared/ThemeToggle';
import { hasModuleAccess, hasPageAccess, canAccessSettings } from '../../utils/permissions';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface SidebarSection {
  id: string;
  label: string;
  items: Array<{ id: string; label: string; icon: any; requiresSuperAdmin?: boolean }>;
}

/**
 * AdminSidebar Component
 * 
 * IMPORTANT: Sidebar Categories vs Backend Permissions
 * ====================================================
 * 
 * Sidebar categories exist only for navigation clarity. They do NOT define security.
 * 
 * Key Rule: Sidebar controls visibility, backend controls access.
 * 
 * A page can:
 * - Exist in backend but not appear in sidebar (if user doesn't have permission)
 * - Appear in sidebar but still be blocked by backend (if permission is missing)
 * 
 * The sidebar filters items based on permissions for better UX, but the backend
 * MUST always enforce permissions regardless of what appears in the sidebar.
 * 
 * Even if an item appears here, the backend API will return 403 if permission is missing.
 */
export default function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // Build sections according to module structure
  // NOTE: These categories are for UI organization only - security is enforced by backend
  // 
  // Module Structure (as per requirements):
  // - General: Dashboard, Payments, Customers, Messages
  // - Management: Organisations, Employees, Users, Admins (Super Admin only)
  // - Tools: Credentials, Invoices, Assets (Credentials is now visible)
  // - Intelligence: Analytics, AI Features, Automation
  // - System: Settings, Security, Logs, Help
  const sections: SidebarSection[] = [
    {
      id: 'general',
      label: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: FiBarChart },
        { id: 'payments', label: 'Payments', icon: FiDollarSign }
      ]
    },
    {
      id: 'management',
      label: 'Management',
      items: [
        { id: 'organizations', label: 'Organisations', icon: FiBriefcase },
        { id: 'employees', label: 'Employees', icon: FiUsers },
        { id: 'users', label: 'Users', icon: FiUsers },
        { id: 'admins', label: 'Admins', icon: FiShield, requiresSuperAdmin: true }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { id: 'products', label: 'Credentials', icon: FiKey },
        { id: 'emails', label: 'Emails', icon: FiMail },
        { id: 'invoices', label: 'Invoices', icon: FiFileText },
        { id: 'assets', label: 'Assets', icon: FiFolder }
      ]
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      items: [
        { id: 'ai-features', label: 'AI Features', icon: FiZap },
        { id: 'automation', label: 'Automation', icon: FiPlayCircle }
      ]
    },
    {
      id: 'system',
      label: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: FiSettings },
        { id: 'logs', label: 'Logs', icon: FiActivity },
        { id: 'help', label: 'Help', icon: FiHelpCircle }
      ]
    }
  ];


  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={`bg-card border-r border-border h-screen transition-all duration-300 relative flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        {!isCollapsed && <h1 className="text-2xl font-bold text-foreground">Atreo</h1>}
        {isCollapsed && <h1 className="text-2xl font-bold text-foreground text-center">A</h1>}
        {!isCollapsed && <ThemeToggle />}
      </div>
      
      {/* Navigation */}
      {/* 
        NOTE: Sidebar visibility is for UX only. Backend will enforce permissions.
        Even if an item appears here, backend APIs will return 403 if permission is missing.
      */}
      <nav className="mt-6 flex-1 overflow-y-auto">
        <div className="px-3 space-y-6">
          {sections.map((section) => {
            // Layer 1: Check module access (for sidebar visibility only)
            // Backend will still enforce this regardless of sidebar visibility
            if (!hasModuleAccess(user, section.id)) {
              return null;
            }

            // Filter items based on permissions (Layer 2: Page access)
            // This is for UX - backend will block access if permission is missing
            const visibleItems = section.items.filter(item => {
              // Super Admin check for specific items
              if (item.requiresSuperAdmin && user?.adminRole !== 'super-admin') {
                return false;
              }

              // Special case: Settings - only Super Admin by default, or with explicit permission
              if (item.id === 'settings') {
                return canAccessSettings(user);
              }

              // Layer 2: Check page access (for sidebar visibility)
              // Backend will enforce this on API calls
              return hasPageAccess(user, section.id, item.id);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.id} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {section.label}
                    </h3>
                  </div>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.id;
                    const handleClick = (e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onTabChange(item.id);
                    };
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={handleClick}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary border-l-4 border-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <IconComponent className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-primary' : ''}`} />
                        {!isCollapsed && item.label}
                        {item.id === 'automation' && !isCollapsed && (
                          <span className="ml-auto text-xs bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">Beta</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>
      
      {/* User Info with Logout */}
      <div className="border-t border-border mt-auto">
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">A</span>
                </div>
              </div>
              {!isCollapsed && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || 'Admin'}</p>
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
