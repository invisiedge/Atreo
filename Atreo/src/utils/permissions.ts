/**
 * Permission Utilities
 * Frontend helpers for checking 3-layer permissions
 */

export interface UserPermissions {
  modules?: {
    [module: string]: {
      pages?: {
        [page: string]: {
          read?: boolean;
          write?: boolean;
        };
      };
    };
  };
}

/**
 * Check if user has module access (Layer 1)
 */
export function hasModuleAccess(
  user: any,
  module: string
): boolean {
  // Super Admin has access to all modules
  if (user?.role === 'admin' && user?.adminRole === 'super-admin') {
    return true;
  }

  // Regular Admin has access to all modules (unless explicitly restricted)
  // Admins should see all sidebar items by default
  if (user?.role === 'admin') {
    return true;
  }

  // Check explicit permissions
  if (!user?.permissions) {
    return false;
  }

  // If permissions is an array (legacy format), check if module is in it
  if (Array.isArray(user.permissions)) {
    // Map module names to permission IDs
    // NOTE: This matches the exact sidebar structure specified in requirements
    const moduleMap: { [key: string]: string[] } = {
      general: ['dashboard', 'payments'],
      management: ['organizations', 'employees', 'users', 'admins'],
      tools: ['products', 'invoices', 'assets'], // Credentials removed - not in sidebar per requirements
      intelligence: ['ai-features', 'automation'],
      system: ['settings', 'logs', 'help']
    };

    const pageIds = moduleMap[module] || [];
    return pageIds.some(pageId => user.permissions.includes(pageId));
  }

  // Check 3-layer permission structure
  if (user.permissions.modules && user.permissions.modules[module]) {
    return true;
  }

  return false;
}

/**
 * Check if user has page access (Layer 2)
 */
export function hasPageAccess(
  user: any,
  module: string,
  page: string
): boolean {
  // Super Admin has access to all pages
  if (user?.role === 'admin' && user?.adminRole === 'super-admin') {
    return true;
  }

  // Regular Admin has access to all pages (unless explicitly restricted)
  // Admins should see all sidebar items by default
  if (user?.role === 'admin') {
    return true;
  }

  // Check module access first (Layer 1)
  if (!hasModuleAccess(user, module)) {
    return false;
  }

  // If permissions is an array (legacy format), check if page is in it
  if (Array.isArray(user.permissions)) {
    return user.permissions.includes(page);
  }

  // Check 3-layer permission structure
  if (
    user.permissions?.modules?.[module]?.pages?.[page]
  ) {
    return true;
  }

  return false;
}

/**
 * Check if user has access type (Layer 3: read or write)
 */
export function hasAccessType(
  user: any,
  module: string,
  page: string,
  accessType: 'read' | 'write' = 'read'
): boolean {
  // Super Admin has full access
  if (user?.role === 'admin' && user?.adminRole === 'super-admin') {
    return true;
  }

  // Check page access first (Layer 2)
  if (!hasPageAccess(user, module, page)) {
    return false;
  }

  // If permissions is an array (legacy format), assume read access
  if (Array.isArray(user.permissions)) {
    return accessType === 'read';
  }

  // Check 3-layer permission structure
  const pagePerm = user.permissions?.modules?.[module]?.pages?.[page];
  if (!pagePerm) {
    return false;
  }

  if (accessType === 'write') {
    return pagePerm.write === true;
  }

  // For read access, either read or write permission is sufficient
  return pagePerm.read === true || pagePerm.write === true;
}

/**
 * Check if user can access Settings
 * Super Admin, Accountants, and Admins with explicit permission can access
 */
export function canAccessSettings(user: any): boolean {
  // Super Admin always has access
  if (user?.role === 'admin' && user?.adminRole === 'super-admin') {
    return true;
  }

  // Accountants have access to settings
  if (user?.role === 'accountant') {
    return true;
  }

  // Check explicit permission for system:settings:read
  return hasAccessType(user, 'system', 'settings', 'read');
}

/**
 * Check if user can assign permissions
 * Only Super Admin can assign permissions
 */
export function canAssignPermissions(user: any): boolean {
  return user?.role === 'admin' && user?.adminRole === 'super-admin';
}

