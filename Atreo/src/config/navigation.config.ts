/**
 * Navigation Configuration
 * Defines sidebar navigation structure
 */

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

/**
 * Admin Navigation Structure
 */
export const ADMIN_NAVIGATION: NavigationGroup[] = [
  {
    id: 'general',
    label: 'General',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'FiGrid',
        path: '/admin/dashboard',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'FiSettings',
        path: '/admin/settings',
      },
    ],
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        icon: 'FiUsers',
        path: '/admin/employees',
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'FiUser',
        path: '/admin/users',
      },
      {
        id: 'admins',
        label: 'Admins',
        icon: 'FiShield',
        path: '/admin/admins',
      },
      {
        id: 'organizations',
        label: 'Organizations',
        icon: 'FiGlobe',
        path: '/admin/organizations',
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: 'FiBriefcase',
        path: '/admin/customers',
      },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Resources',
    items: [
      {
        id: 'tools',
        label: 'Tools',
        icon: 'FiTool',
        path: '/admin/tools',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        icon: 'FiKey',
        path: '/admin/credentials',
      },
      {
        id: 'assets',
        label: 'Assets',
        icon: 'FiPackage',
        path: '/admin/assets',
      },
    ],
  },
  {
    id: 'financial',
    label: 'Financial',
    items: [
      {
        id: 'payroll',
        label: 'Payroll',
        icon: 'FiDollarSign',
        path: '/admin/payroll',
      },
      {
        id: 'invoices',
        label: 'Invoices',
        icon: 'FiFileText',
        path: '/admin/invoices',
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'FiBarChart2',
        path: '/admin/analytics',
      },
      {
        id: 'ai',
        label: 'AI Features',
        icon: 'FiCpu',
        path: '/admin/ai-features',
      },
      {
        id: 'automation',
        label: 'Automation',
        icon: 'FiZap',
        path: '/admin/automation',
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    items: [
      {
        id: 'messages',
        label: 'Messages',
        icon: 'FiMessageSquare',
        path: '/admin/messages',
      },
      {
        id: 'emails',
        label: 'Emails',
        icon: 'FiMail',
        path: '/admin/emails',
      },
      {
        id: 'domains',
        label: 'Domains',
        icon: 'FiServer',
        path: '/admin/domains',
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'security',
        label: 'Security',
        icon: 'FiLock',
        path: '/admin/security',
      },
      {
        id: 'logs',
        label: 'Logs',
        icon: 'FiList',
        path: '/admin/logs',
      },
      {
        id: 'help',
        label: 'Help',
        icon: 'FiHelpCircle',
        path: '/admin/help',
      },
    ],
  },
];

/**
 * User Navigation Structure
 */
export const USER_NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'FiGrid',
    path: '/user/dashboard',
  },
  {
    id: 'submission',
    label: 'Payroll Submission',
    icon: 'FiSend',
    path: '/user/submission',
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'FiTool',
    path: '/user/tools',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'FiUser',
    path: '/user/profile',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'FiSettings',
    path: '/user/settings',
  },
];
