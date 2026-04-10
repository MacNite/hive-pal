import { useTranslation } from 'react-i18next';
import { Droplet, Grid, Pill, StickyNote, Wrench } from 'lucide-react';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import {
  FeedingActionType,
  FeedingForm,
  FeedingView,
} from '@/pages/inspection/components/inspection-form/actions/feeding.tsx';
import {
  TreatmentActionType,
  TreatmentForm,
  TreatmentView,
} from '@/pages/inspection/components/inspection-form/actions/treatment.tsx';
import {
  FramesActionType,
  FramesForm,
  FramesView,
} from '@/pages/inspection/components/inspection-form/actions/frames.tsx';
import {
  NoteActionType,
  NoteForm,
  NoteView,
} from '@/pages/inspection/components/inspection-form/actions/note.tsx';
import {
  MaintenanceActionType,
  MaintenanceForm,
  MaintenanceView,
} from '@/pages/inspection/components/inspection-form/actions/maintenance.tsx';
import { Button } from '@/components/ui/button';
import { TEST_SELECTORS } from '@/utils/test-selectors.ts';
import { useFormContext } from 'react-hook-form';
import { ActionData, InspectionFormData } from './schema.ts';
import { AiBadge } from './ai-badge';
import { AiFieldControls } from './ai-field-controls';
import type { AiMergeState } from '@/pages/inspection/lib/inspection-ai-merge';

const actionTypes = [
  { id: 'FEEDING', label: 'Feeding', Icon: Droplet },
  { id: 'TREATMENT', label: 'Treatment', Icon: Pill },
  { id: 'FRAME', label: 'Frames', Icon: Grid },
  { id: 'MAINTENANCE', label: 'Maintenance', Icon: Wrench },
  { id: 'NOTE', label: 'Note', Icon: StickyNote },
];

export type OtherActionType = {
  type: 'OTHER';
  notes: string;
};

export type ActionType =
  | FeedingActionType
  | TreatmentActionType
  | FramesActionType
  | MaintenanceActionType
  | NoteActionType
  | OtherActionType;

interface ActionsSectionProps {
  editMode?: boolean;
  isAiSuggested?: (field: keyof InspectionFormData) => boolean;
  aiMergeState?: AiMergeState | null;
  onAcceptSuggestion?: (field: keyof InspectionFormData) => void;
  onDismissSuggestion?: (field: keyof InspectionFormData) => void;
}

export const ActionsSection: React.FC<ActionsSectionProps> = ({
  editMode = false,
  isAiSuggested,
  aiMergeState,
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const { t } = useTranslation('inspection');
  const { setValue, getValues, watch, formState } =
    useFormContext<InspectionFormData>();

  const actionLabels: Record<string, string> = {
    FEEDING: t('inspection:form.actions.feeding'),
    TREATMENT: t('inspection:form.actions.treatment'),
    FRAME: t('inspection:form.actions.frames'),
    MAINTENANCE: t('inspection:form.actions.maintenance'),
    NOTE: t('inspection:form.actions.note'),
  };

  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const formActions = watch('actions') || [];
  const actionsSuggestion = aiMergeState?.suggestions.actions;

  const handleSave = useCallback(
    (action: ActionType) => {
      const currentActions = getValues('actions') || [];
      const updatedActions = [
        ...currentActions.filter(a => a.type !== action.type),
        action as ActionData,
      ];

      setValue('actions', updatedActions, {
        shouldDirty: true,
        shouldTouch: true,
      });
      setSelectedAction(null);
    },
    [getValues, setValue],
  );

  const handleRemove = useCallback(
    (actionType: ActionType['type']) => {
      const currentActions = getValues('actions') || [];
      setValue(
        'actions',
        currentActions.filter(a => a.type !== actionType),
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [getValues, setValue],
  );

  const renderActionForm = useMemo(() => {
    if (!selectedAction) return null;

    switch (selectedAction) {
      case 'FEEDING':
        return <FeedingForm onSave={handleSave} onRemove={handleRemove} />;
      case 'TREATMENT':
        return <TreatmentForm onSave={handleSave} onRemove={handleRemove} />;
      case 'FRAME':
        return <FramesForm onSave={handleSave} onRemove={handleRemove} />;
      case 'MAINTENANCE':
        return <MaintenanceForm onSave={handleSave} onRemove={handleRemove} />;
      case 'NOTE':
        return <NoteForm onSave={handleSave} onRemove={handleRemove} />;
      default:
        return null;
    }
  }, [selectedAction, handleSave, handleRemove]);

  const renderActionView = (action: ActionType): ReactNode => {
    switch (action.type) {
      case 'FEEDING':
        return (
          <FeedingView
            key="feeding"
            onSave={handleSave}
            action={action}
            onRemove={handleRemove}
          />
        );
      case 'TREATMENT':
        return (
          <TreatmentView
            key="treatment"
            onSave={handleSave}
            action={action}
            onRemove={handleRemove}
          />
        );
      case 'FRAME':
        return (
          <FramesView
            key="frames"
            onSave={handleSave}
            action={action}
            onRemove={handleRemove}
          />
        );
      case 'MAINTENANCE':
        return (
          <MaintenanceView
            key="maintenance"
            onSave={handleSave}
            action={action}
            onRemove={handleRemove}
          />
        );
      case 'NOTE':
        return (
          <NoteView
            key="note"
            onSave={handleSave}
            action={action}
            onRemove={handleRemove}
          />
        );
      case 'OTHER':
        return (
          <NoteView
            key="other"
            onSave={handleSave}
            action={{ type: 'NOTE', notes: action.notes }}
            onRemove={() => handleRemove('OTHER')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h3 className="my-4 text-lg font-medium">
        {editMode
          ? t('inspection:form.actions.titleSingular')
          : t('inspection:form.actions.title')}
        {isAiSuggested?.('actions') && <AiBadge />}
      </h3>

      <AiFieldControls
        isVisible={Boolean(actionsSuggestion)}
        hasConflict={actionsSuggestion?.hasConflict}
        status={actionsSuggestion?.status}
        onAccept={() => onAcceptSuggestion?.('actions')}
        onDismiss={() => onDismissSuggestion?.('actions')}
      />

      {!editMode && (
        <div
          data-test={TEST_SELECTORS.ACTION_BUTTONS}
          className="flex flex-wrap gap-2"
        >
          {actionTypes.map(({ id, label, Icon }) => {
            if (formActions.some(a => a.type === id)) return null;

            return (
              <Button
                size="sm"
                type="button"
                onClick={e => {
                  e.preventDefault();
                  setSelectedAction(id);
                }}
                key={id}
              >
                <Icon size={16} />
                {actionLabels[id] || label}
              </Button>
            );
          })}
        </div>
      )}

      {renderActionForm && <div>{renderActionForm}</div>}

      {formState.errors.actions && (
        <div className="text-red-500">{formState.errors.actions.message}</div>
      )}

      <div
        className="flex flex-col divide-y"
        data-test={TEST_SELECTORS.SELECTED_ACTIONS}
      >
        {formActions.map((action, index) => (
          <div key={`${action.type}-${index}`}>
            {renderActionView(action as ActionType)}
          </div>
        ))}
      </div>
    </div>
  );
};