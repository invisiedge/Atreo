import { useState } from 'react';
import { 
  FiBarChart, 
  FiUsers, 
  FiDollarSign, 
  FiChevronLeft,
  FiChevronRight,
  FiLogOut
} from 'react-icons/fi';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart },
    { id: 'employees', label: 'Employees', icon: FiUsers },
    { id: 'payroll', label: 'Payroll', icon: FiDollarSign }
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`bg-white border-r border-gray-200 min-h-screen transition-all duration-300 relative ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        {!isCollapsed && <h1 className="text-2xl font-bold text-foreground">Atreo</h1>}
        {isCollapsed && <h1 className="text-2xl font-bold text-foreground text-center">A</h1>}
      </div>
      
      {/* Navigation */}
      <nav className="mt-6">
        <div className="px-3 space-y-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-foreground'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-foreground'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? tab.label : undefined}
              >
                <IconComponent className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && tab.label}
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* User Info with Logout */}
      <div className="absolute bottom-0 border-t border-gray-200 w-full">
        <div className={`p-4 ${isCollapsed ? 'w-16' : 'w-64'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">A</span>
                </div>
              </div>
              {!isCollapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-foreground">Admin</p>
                  <p className="text-xs text-gray-500">Admin</p>
                </div>
              )}
            </div>
            
            {/* Logout Button */}
            {!isCollapsed && (
              <button className="flex items-center px-2 py-1 text-sm font-medium rounded-md transition-colors text-red-600 hover:bg-red-50 hover:text-red-700">
                <FiLogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -right-4 transform -translate-y-1/2 bg-white border-2 border-gray-300 rounded-full p-1.5 shadow-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 z-50"
      >
        {isCollapsed ? (
          <FiChevronRight className="h-4 w-4 text-gray-700" />
        ) : (
          <FiChevronLeft className="h-4 w-4 text-gray-700" />
        )}
      </button>
    </div>
  );
}
