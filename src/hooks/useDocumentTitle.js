import { useEffect } from 'react';
import { getToolRoute, localizeToolRoute } from '../toolRegistry.js';

export function useDocumentTitle({ activeTool, modeProfile, language, t }) {
  useEffect(() => {
    const route = getToolRoute(activeTool);
    const localizedRoute = route ? localizeToolRoute(route, t) : null;
    document.title = localizedRoute?.id === 'tool-home' && modeProfile.id === 'all'
      ? t('navigation:titles.default')
      : t('navigation:titles.tool', {
        tool: localizedRoute?.id === 'tool-home' ? modeProfile.label : localizedRoute?.title,
      });
  }, [activeTool, language, modeProfile.id, modeProfile.label, t]);
}
