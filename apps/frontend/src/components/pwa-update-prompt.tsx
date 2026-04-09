import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function PWAUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (needRefresh) {
      toast(t('pwa.updateAvailable', 'A new version is available'), {
        duration: Infinity,
        action: {
          label: t('pwa.reload', 'Reload'),
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker, t]);

  return null;
}
