import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { canAccessSettings } from './utils/permissions';
import { STORAGE_KEYS } from './constants/index';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminAdmins from './pages/admin/AdminAdmins';
import AdminPayments from './pages/admin/AdminPayments';
import AdminTools from './pages/admin/AdminTools';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAIFeatures from './pages/admin/AdminAIFeatures';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrganizations from './pages/admin/AdminOrganizations';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminAssets from './pages/admin/AdminAssets';
import AdminDomains from './pages/admin/AdminDomains';
import AdminEmails from './pages/admin/AdminEmails';
import AdminMessages from './pages/admin/AdminMessages';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCredentials from './pages/admin/AdminCredentials';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminAutomation from './pages/admin/AdminAutomation';
import AdminSecurity from './pages/admin/AdminSecurity';
import AdminLogs from './pages/admin/AdminLogs';
import AdminHelp from './pages/admin/AdminHelp';
import EmployeeDashboard from './pages/user/EmployeeDashboard';
import UserSubmission from './pages/user/UserSubmission';
import UserProfileComponent from './pages/user/UserProfile';
import UserTools from './pages/user/UserTools';
import Settings from './pages/Settings';
import MobileBlock from './components/MobileBlock';
import ErrorBoundary from './components/ErrorBoundary';

const AppContent: React.FC = () => {
  const { user, isLoading, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const adminTabs = [
    'dashboard',
    'payments',
    'customers',
    'messages',
    'organizations',
    'employees',
    'users',
    'admins',
    'products',
    'invoices',
    'assets',
    'credentials',
    'analytics',
    'ai-features',
    'automation',
    'settings',
    'security',
    'logs',
    'help',
    'payroll',
    'tools',
    'domains',
    'emails'
  ];
  const userTabs = ['dashboard', 'submission', 'tools', 'invoices', 'profile', 'settings'];
  const getDefaultTab = (role: string | undefined) => (role === 'admin' ? 'dashboard' : 'dashboard');

  // Restore last active tab on load (per role) - only during same session
  useEffect(() => {
    if (!user) return;
    const storageKey = `atreo_active_tab_${user.role}`;
    const storedTab = sessionStorage.getItem(storageKey); // Use sessionStorage instead of localStorage
    const allowedTabs = user.role === 'admin' ? adminTabs : userTabs;
    if (storedTab && allowedTabs.includes(storedTab)) {
      setActiveTab(storedTab);
    } else {
      setActiveTab(getDefaultTab(user.role));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);


  // Redirect regular admins away from admins page
  useEffect(() => {
    if (user && user.role === 'admin' && activeTab === 'admins' && user.adminRole !== 'super-admin') {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

  // Handle tab change with proper state update
  const handleTabChange = React.useCallback(
    (tab: string) => {
      const allowedTabs = user?.role === 'admin' ? adminTabs : userTabs;
      const targetTab = allowedTabs.includes(tab) ? tab : getDefaultTab(user?.role);
      setActiveTab(targetTab);
      if (user) {
        sessionStorage.setItem(`atreo_active_tab_${user.role}`, targetTab); // Use sessionStorage
      }
    },
    [adminTabs, user, userTabs]
  );

  // Page content memoization - MUST be before any conditional returns (Rules of Hooks)
  // 
  // IMPORTANT: Frontend checks are for UX only. Backend APIs will enforce permissions.
  // Even if a page component renders here, API calls will return 403 if permission is missing.
  const pageContent = useMemo(() => {
    if (!user) return null;
    
    if (user.role === 'admin') {
      switch (activeTab) {
        // General
        case 'dashboard':
          return <AdminDashboard key="dashboard" />;
        case 'payments':
          return <AdminPayments key="payments" />; // Use AdminPayments component
        case 'customers':
          return <AdminCustomers key="customers" />;
        case 'messages':
          return <AdminMessages key="messages" />;
        
        // Management
        case 'organizations':
          return <AdminOrganizations key="organizations" />;
        case 'employees':
          return <AdminEmployees key="employees" />;
        case 'users':
          return <AdminUsers key="users" />;
        case 'admins':
          // Only super-admins can access the Admins page
          if (user.adminRole !== 'super-admin') {
            return <AdminDashboard key="dashboard-fallback" />;
          }
          return <AdminAdmins key="admins" />;
        
        // Tools
        case 'products':
          return <AdminTools key="products" />; // Map products to tools
        case 'invoices':
          return <AdminInvoices key="invoices" />;
        case 'assets':
          return <AdminAssets key="assets" />;
        case 'credentials':
          // Credentials page exists but is NOT in sidebar per requirements
          // Can still be accessed via direct URL if permissions allow
          return <AdminCredentials key="credentials" />;
        
        // Intelligence
        case 'analytics':
          return <AdminAnalytics key="analytics" />;
        case 'ai-features':
          return <AdminAIFeatures key="ai-features" />;
        case 'automation':
          return <AdminAutomation key="automation" />;
        
        // System (highly sensitive - check permissions)
        case 'settings':
          // Only Super Admin by default, or Admins with explicit permission
          if (user.adminRole !== 'super-admin' && !canAccessSettings(user)) {
            return <AdminDashboard key="dashboard-fallback" />;
          }
          return <AdminSettings key="settings" />;
        case 'security':
          // Only admins can access security
          if (user.role !== 'admin') {
            return <AdminDashboard key="dashboard-fallback" />;
          }
          return <AdminSecurity key="security" />;
        case 'logs':
          // Only admins can access logs
          if (user.role !== 'admin') {
            return <AdminDashboard key="dashboard-fallback" />;
          }
          return <AdminLogs key="logs" />;
        case 'help':
          return <AdminHelp key="help" />;
        
        // Legacy routes (for backward compatibility)
        case 'payroll':
          return <AdminPayments key="payroll" />; // Use AdminPayments for payroll too
        case 'tools':
          return <AdminTools key="tools" />;
        case 'domains':
          return <AdminDomains key="domains" />;
        case 'emails':
          return <AdminEmails key="emails" />;
        
        default:
          return <AdminDashboard key="dashboard-default" />;
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return <EmployeeDashboard key="dashboard" />;
        case 'submission':
          return <UserSubmission key="submission" />;
        case 'tools':
          return <UserTools key="tools" />;
        case 'invoices':
          return <AdminInvoices key="invoices" />;
        case 'profile':
          return <UserProfileComponent key="profile" />;
        case 'settings':
          return <Settings key="settings" />;
        default:
          return <EmployeeDashboard key="dashboard-default" />;
      }
    }
  }, [activeTab, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleSignupSuccess = (newUser: any, token: string) => {
      // Store token and user in localStorage (matching AuthContext pattern)
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      // Update user context
      setUser(newUser);
    };

    if (authView === 'signup') {
      return (
        <Signup
          onBackToLogin={() => setAuthView('login')}
          onSignupSuccess={handleSignupSuccess}
        />
      );
    }

    return <Login onSwitchToSignup={() => setAuthView('signup')} />;
  }

  if (user.role === 'admin') {
    return (
      <ErrorBoundary>
        <AdminLayout activeTab={activeTab} onTabChange={handleTabChange}>
          {pageContent}
        </AdminLayout>
      </ErrorBoundary>
    );
  } else {
    return (
      <ErrorBoundary>
        <UserLayout activeTab={activeTab} onTabChange={handleTabChange}>
          {pageContent}
        </UserLayout>
      </ErrorBoundary>
    );
  }
};

const App: React.FC = () => {
  return (
    <MobileBlock>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MobileBlock>
  );
};

export default App;
