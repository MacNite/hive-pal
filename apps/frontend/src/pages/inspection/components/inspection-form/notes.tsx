import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { InspectionFormData } from './schema';
import { AiBadge } from './ai-badge';
import { AiFieldControls } from './ai-field-controls';
import type { AiMergeState } from '@/pages/inspection/lib/inspection-ai-merge';

type NotesSectionProps = {
  isAiSuggested?: (field: keyof InspectionFormData) => boolean;
  aiMergeState?: AiMergeState | null;
  onAcceptSuggestion?: (field: keyof InspectionFormData) => void;
  onDismissSuggestion?: (field: keyof InspectionFormData) => void;
};

export function NotesSection({
  isAiSuggested,
  aiMergeState,
  onAcceptSuggestion,
  onDismissSuggestion,
}: NotesSectionProps) {
  const { t } = useTranslation('inspection');
  const form = useFormContext<InspectionFormData>();

  const notesSuggestion = aiMergeState?.suggestions.notes;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">
        {t('inspection:form.notes.title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('inspection:form.notes.description')}
      </p>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Notes
              {isAiSuggested?.('notes') && <AiBadge />}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('inspection:form.notes.placeholder')}
                className="min-h-[120px]"
                {...field}
                value={field.value ?? ''}
              />
            </FormControl>

            <AiFieldControls
              isVisible={Boolean(notesSuggestion)}
              hasConflict={notesSuggestion?.hasConflict}
              status={notesSuggestion?.status}
              onAccept={() => onAcceptSuggestion?.('notes')}
              onDismiss={() => onDismissSuggestion?.('notes')}
            />

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}