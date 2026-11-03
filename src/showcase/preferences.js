/** User display choices outlive a robot scene; model and tour state do not. */
export const DEFAULT_VIEWER_PREFERENCES = Object.freeze({ themeId:'ember', accent:'#ff6840', appearance:'light', grid:true, quality:'balanced', renderStyle:'engineering' });
export function supportedViewerPreferences(preference, capabilities) {
  const display = { grid:Boolean(preference.grid) };
  if (capabilities.displayOptions.appearances.includes(preference.appearance)) display.appearance = preference.appearance;
  const theme = preference.themeId === 'custom'
    ? capabilities.customAccent ? { themeId:'custom', accent:preference.accent } : null
    : capabilities.themes.includes(preference.themeId) ? { themeId:preference.themeId } : null;
  return {
    display, theme,
    quality:capabilities.qualityProfiles.includes(preference.quality) ? preference.quality : null,
    renderStyle:capabilities.renderStyles.enabled.includes(preference.renderStyle) ? preference.renderStyle : null
  };
}
