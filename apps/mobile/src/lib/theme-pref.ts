import { Appearance } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'cf_theme_pref';

/**
 * Manual light/dark override. `Appearance.setColorScheme` drives both
 * NativeWind `dark:` classes and our Paper theme (they read
 * useColorScheme), so one call themes the whole app.
 */
export async function loadThemePref(): Promise<ThemePref> {
  const stored = (await SecureStore.getItemAsync(KEY)) as ThemePref | null;
  const pref: ThemePref = stored ?? 'system';
  applyThemePref(pref);
  return pref;
}

export async function setThemePref(pref: ThemePref): Promise<void> {
  await SecureStore.setItemAsync(KEY, pref);
  applyThemePref(pref);
}

function applyThemePref(pref: ThemePref): void {
  Appearance.setColorScheme(pref === 'system' ? null : pref);
}
