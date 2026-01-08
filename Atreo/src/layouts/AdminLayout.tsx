import React from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="h-screen bg-background flex overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AdminSidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
