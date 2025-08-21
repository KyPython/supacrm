// src/lib/roles.ts
export type UserRole = 'super_admin' | 'admin' | 'agent' | 'user';

export type Role = 'super_admin' | 'admin' | 'agent' | 'user';

export const roleHierarchy: Role[] = [
  'super_admin',
  'admin',
  'agent',
  'user'
];

export function canManageUsers(role: Role) {
  return role === 'super_admin' || role === 'admin';
}

export function canEditProject(role: Role) {
  return role !== 'user';
}

export function canViewAllTasks(role: Role) {
  return role !== 'user';
}

// Add more permission helpers as needed

export interface RolePermissions {
  canManageUsers: boolean;
  canManageCompanies: boolean;
  canManageDeals: boolean;
  canManageProjects: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
  canUploadFiles: boolean;
  canDeleteRecords: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    canManageUsers: true,
    canManageCompanies: true,
    canManageDeals: true,
    canManageProjects: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canUploadFiles: true,
    canDeleteRecords: true,
  },
  admin: {
    canManageUsers: true,
    canManageCompanies: true,
    canManageDeals: true,
    canManageProjects: true,
    canViewAnalytics: true,
    canManageSettings: false,
    canUploadFiles: true,
    canDeleteRecords: true,
  },
  agent: {
    canManageUsers: false,
    canManageCompanies: true,
    canManageDeals: true,
    canManageProjects: true,
    canViewAnalytics: false,
    canManageSettings: false,
    canUploadFiles: true,
    canDeleteRecords: false,
  },
  user: {
    canManageUsers: false,
    canManageCompanies: false,
    canManageDeals: false,
    canManageProjects: false,
    canViewAnalytics: false,
    canManageSettings: false,
    canUploadFiles: false,
    canDeleteRecords: false,
  },
};

export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  const perms = ROLE_PERMISSIONS[userRole];
  return perms ? perms[permission] === true : false;
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const routePermissions: Record<string, keyof RolePermissions> = {
    '/users': 'canManageUsers',
    '/companies': 'canManageCompanies',
    '/deals': 'canManageDeals',
    '/projects': 'canManageProjects',
    '/analytics': 'canViewAnalytics',
    '/settings': 'canManageSettings',
  };

  const requiredPermission = routePermissions[route];
  if (!requiredPermission) return true; // Public routes
  
  return hasPermission(userRole, requiredPermission);
}