import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EditIcon,
  Icon,
  PlusCircle,
  TrashIcon,
  RefreshCw,
  CalendarPlus,
} from 'lucide-react';
import { bee } from '@lucide/lab';
import { useTranslation } from 'react-i18next';

import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import { AlertItem } from '@/components/alerts';
import { useHive } from '@/api/hooks';
import { QRCodeDialog } from './qr-code-dialog';
import { LlmPromptDialog } from './llm-prompt-dialog';
import {
  ActionSidebarContainer,
  ActionSidebarGroup,
  MenuItemButton,
  WeatherForecastSection,
} from '@/components/sidebar';
import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

type ActionSideBarProps = {
  hiveId?: string;
  onRefreshData?: () => void;
};

export const ActionSideBar: React.FC<ActionSideBarProps> = ({
  hiveId,
  onRefreshData,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation(['hive', 'inspection']);
  const { data: hive } = useHive(hiveId || '', { enabled: !!hiveId });

  return (
    <div className="space-y-4">
      {/* Alerts Section */}
      {hive?.alerts && hive.alerts.length > 0 && (
        <div className="border rounded-md">
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 pt-2">
              Active Alerts
            </SidebarGroupLabel>
            <div className="px-2 pb-2 space-y-1 max-h-64 overflow-y-auto">
              {hive.alerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} showActions={true} />
              ))}
            </div>
          </SidebarGroup>
        </div>
      )}

      <WeatherForecastSection apiaryId={hive?.apiaryId} compact />

      <ActionSidebarContainer>
        <ActionSidebarGroup
          title={t('hive:actions.title', { defaultValue: 'Hive Actions' })}
        >
          <MenuItemButton
            icon={<PlusCircle className="h-4 w-4" />}
            label={t('inspection:actions.addInspection', {
              defaultValue: 'Add Inspection',
            })}
            onClick={() =>
              hiveId && navigate(`/hives/${hiveId}/inspections/create`)
            }
            tooltip={t('inspection:actions.addInspection', {
              defaultValue: 'Add Inspection',
            })}
            disabled={!hiveId}
          />
          <MenuItemButton
            icon={<CalendarPlus className="h-4 w-4" />}
            label={t('inspection:actions.scheduleInspection', {
              defaultValue: 'Schedule Inspection',
            })}
            onClick={() => navigate(`/inspections/schedule`)}
            tooltip={t('inspection:actions.scheduleInspection', {
              defaultValue: 'Schedule Inspection',
            })}
          />
          <MenuItemButton
            icon={<Icon iconNode={bee} className="h-4 w-4" />}
            label={t('hive:actions.addQueen', {
              defaultValue: 'Add Queen',
            })}
            onClick={() => hiveId && navigate(`/hives/${hiveId}/queens/create`)}
            tooltip={t('hive:actions.addQueen', {
              defaultValue: 'Add Queen',
            })}
            disabled={!hiveId}
          />
          <MenuItemButton
            icon={<RefreshCw className="h-4 w-4" />}
            label={t('hive:actions.refreshData', {
              defaultValue: 'Refresh Data',
            })}
            onClick={() => onRefreshData?.()}
            tooltip={t('hive:actions.refreshData', {
              defaultValue: 'Refresh Data',
            })}
          />
        </ActionSidebarGroup>

        <ActionSidebarGroup
          title={t('hive:manage.title', { defaultValue: 'Manage Hive' })}
          className="mt-4"
        >
          <MenuItemButton
            icon={<EditIcon className="h-4 w-4" />}
            label={t('hive:edit.title', { defaultValue: 'Edit Hive' })}
            onClick={() => hiveId && navigate(`/hives/${hiveId}/edit`)}
            tooltip={t('hive:edit.title', { defaultValue: 'Edit Hive' })}
            disabled={!hiveId}
          />
          <SidebarMenuItem>
            {hiveId && hive ? (
              <QRCodeDialog hiveId={hiveId} hiveName={hive.name} />
            ) : (
              <SidebarMenuButton
                disabled
                tooltip={t('hive:actions.qr', { defaultValue: 'QR Code' })}
              >
                <span>{t('hive:actions.qr', { defaultValue: 'QR Code' })}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            {hiveId && hive ? (
              <LlmPromptDialog hiveId={hiveId} hiveName={hive.name} />
            ) : (
              <SidebarMenuButton
                disabled
                tooltip={t('hive:manage.llmPrompt', { defaultValue: 'LLM Prompt', })}
              >
                <span>
                  {t('hive:manage.llmPrompt', { defaultValue: 'LLM Prompt' })}
                </span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
          <MenuItemButton
            icon={<TrashIcon className="h-4 w-4" />}
            label={t('hive:manage.removeHive', { defaultValue: 'Remove Hive' })}
            onClick={() => alert('Remove functionality coming soon')}
            tooltip={t('hive:manage.removeHive', { defaultValue: 'Remove Hive' })}
            disabled={!hiveId}
          />
        </ActionSidebarGroup>
      </ActionSidebarContainer>
    </div>
  );
};
