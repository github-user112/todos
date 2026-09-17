/** Retired dark-glass preferences map to their light counterpart.
 * Ordinary dark/auto modes are deliberately unchanged.
 */
export function normalizeTheme(theme) {
  const aliases = {
    'ios26-glass-dark': 'ios26-glass',
    'liquid-aurora-glass-dark': 'liquid-aurora-glass',
    'fluid-glass-dark': 'fluid-glass',
  };
  return Object.hasOwn(aliases, theme) ? aliases[theme] : theme;
}
