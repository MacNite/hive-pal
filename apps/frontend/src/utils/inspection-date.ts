/**
 * Serializes an inspection date to ISO string.
 * All-day dates are stored as UTC midnight for the chosen calendar date,
 * so they are queried and compared consistently on the server regardless of timezone.
 */
export const toInspectionDateISOString = (
  date: Date,
  isAllDay: boolean,
): string => {
  if (!isAllDay) return date.toISOString();
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  ).toISOString();
};
