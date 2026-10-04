import { useEffect } from 'react';

/**
 * Hook to listen for 'Esc' key to trigger 'Back to Dashboard' from any active game.
 * Respects input field focus and fullscreen states.
 */
export function useEscapeToDashboard(onBack: () => void, isEnabled: boolean = true) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If an input or textarea or modal form is focused, unfocus it first
        const activeEl = document.activeElement;
        const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);
        if (isInput) {
          (activeEl as HTMLElement).blur();
          return;
        }

        // If in HTML5 fullscreen, exiting fullscreen is handled by the browser
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          return;
        }

        // Navigate back to dashboard
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isEnabled]);
}
