import React from 'react';
import UserSidebar from '../components/user/UserSidebar';

interface UserLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className="h-screen bg-background flex overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <UserSidebar activeTab={activeTab} onTabChange={onTabChange} />

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

export default UserLayout;
