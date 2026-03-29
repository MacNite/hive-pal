import { useApiary } from './use-apiary';
import type { ApiaryRole } from 'shared-schemas';

export const useApiaryPermission = () => {
  const { activeApiary } = useApiary();

  const role: ApiaryRole | undefined = activeApiary?.role;
  const isOwner = role === 'OWNER';
  const canEdit = role === 'OWNER' || role === 'EDITOR';

  return { role, isOwner, canEdit };
};
