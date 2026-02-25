import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: {
    module: string;
    action: 'view' | 'create' | 'update' | 'delete';
  };
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallback = <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Accès non autorisé</h2>
      <p className="text-slate-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
    </div>
  </div>
}) => {
  const { user } = useAuth();

  // Check if user is authenticated
  if (!user) {
    return fallback;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    return fallback;
  }

  // Check permission-based access (simplified for now)
  if (requiredPermission) {
    // For now, only admin has all permissions
    if (user.role !== UserRole.ADMIN) {
      return fallback;
    }
  }

  return <>{children}</>;
};
