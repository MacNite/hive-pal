import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useApiaryPermission } from '@/hooks/useApiaryPermission';

interface EditableRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Route guard that only allows access for users with edit permissions
 * on the active apiary (OWNER or EDITOR role).
 * Redirects VIEWER users to the specified path or home.
 */
export function EditableRoute({
  children,
  redirectTo = '/',
}: EditableRouteProps) {
  const { canEdit, role } = useApiaryPermission();

  // If role is undefined (still loading), render children to avoid flash
  if (role === undefined) {
    return <>{children}</>;
  }

  if (!canEdit) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
