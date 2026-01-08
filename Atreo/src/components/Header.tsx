interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'employees', label: 'Employees', icon: '👥' },
    { id: 'payroll', label: 'Payroll', icon: '💰' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-foreground">Atreo</h1>
      </div>
      
      {/* Navigation */}
      <nav className="mt-6">
        <div className="px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-100 text-foreground border-r-2 border-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-foreground'
              }`}
            >
              <span className="mr-3 text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
      
      {/* User Info */}
      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">A</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground">Admin</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
