const STORAGE_KEY = 'hivepal-share-prompt-dismissed';

export function isSharePromptDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSharePromptDismissed(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // silently fail
  }
}
