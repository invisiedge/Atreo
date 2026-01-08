import { useState } from 'react';
import {
  FiHome,
  FiFileText,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiTool,
  FiSettings
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../shared/ThemeToggle';
import { hasPageAccess } from '../../utils/permissions';

interface UserSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function UserSidebar({ activeTab, onTabChange }: UserSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // All available tabs with their module mapping
  // Maps user sidebar tabs to admin sidebar modules/pages
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome, module: 'general', page: 'dashboard' },
    { id: 'submission', label: 'Submit Request', icon: FiFileText, module: null, page: null }, // Legacy page, always show
    { id: 'tools', label: 'Tools', icon: FiTool, module: 'tools', page: 'products' }, // Maps to products
    { id: 'invoices', label: 'Invoices', icon: FiFileText, module: 'tools', page: 'invoices' },
    { id: 'profile', label: 'Profile', icon: FiUser, module: null, page: null }, // Always show profile
    { id: 'settings', label: 'Settings', icon: FiSettings, module: 'system', page: 'settings' }
  ];

  // Filter tabs based on user permissions
  const tabs = allTabs.filter(tab => {
    // Always show profile and submission (legacy pages)
    if (tab.id === 'profile' || tab.id === 'submission') {
      return true;
    }

    // If no module/page mapping, show by default
    if (!tab.module || !tab.page) {
      return true;
    }

    // Check 3-layer permission structure first
    if (
      user &&
      typeof user.permissions === 'object' &&
      !Array.isArray(user.permissions) &&
      'modules' in user.permissions
    ) {
      return hasPageAccess(user, tab.module, tab.page);
    }

    // Fallback to array-based permissions (legacy format)
    if (Array.isArray(user?.permissions)) {
      // For array format, check if the page ID is in the array
      // Also check for legacy 'tools' permission which maps to 'products'
      if (tab.id === 'tools' && user.permissions.includes('products')) {
        return true;
      }
      return user.permissions.includes(tab.id);
    }

    // If no permissions structure, show all tabs (backward compatibility)
    return true;
  });

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
      <nav className="mt-6 flex-1">
        <div className="px-3 space-y-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onTabChange(tab.id);
            };
            return (
              <button
                key={tab.id}
                type="button"
                onClick={handleClick}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? tab.label : undefined}
              >
                <IconComponent className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-primary' : ''}`} />
                {!isCollapsed && tab.label}
              </button>
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
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              {!isCollapsed && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || 'Employee'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || 'employee@atreo.com'}</p>
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
