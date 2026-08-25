import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
| Light or dark, chosen by the user and remembered on the device.
|
| The choice is deliberate, never inherited: the operating system's own
| preference is not consulted, so a machine set to dark does not decide for
| an employee who wants the light portal. Anything that is not a stored
| "dark" is light, which also makes a missing or corrupted value safe.
|
| The class lives on <html> rather than on a wrapper element, because the
| tokens in index.css are declared under `.dark` and the page background is
| painted from <body>. One class at the root moves the whole document.
|
| localStorage is read behind try/catch throughout: private browsing modes
| throw on access, and a portal that will not open is a worse outcome than
| one that forgets a colour.
|--------------------------------------------------------------------------
*/

const STORAGE_KEY = "hrms-theme";

const LIGHT = "light";
const DARK = "dark";

// Matches the rule in index.css that holds transitions off during the swap.
const SWITCHING = "theme-switching";

/*
|--------------------------------------------------------------------------
| TEMPORARY - theme switched off
|--------------------------------------------------------------------------
| The dark theme is only painted onto the shell so far (navbar, sidebar,
| profile drawer, notification bell); every page inside it is still on the
| old hard coded light colours. Half a dark app is worse than none, so the
| switch is held shut until the rest is converted.
|
| Nothing here is deleted or disconnected: the provider, the hook and the
| tokens all still work. While this is false the app simply stays on the
| light theme, which is the exact palette it had before the theme existed,
| and the toggle is not offered in the navbar.
|
| To carry on with the theme work, flip this one constant back to true.
*/
export const THEME_ENABLED = true;

const readStoredTheme = () => {

  // Held on light regardless of what the device remembers.
  if (!THEME_ENABLED) return LIGHT;

  try {
    return localStorage.getItem(STORAGE_KEY) === DARK ? DARK : LIGHT;
  } catch {
    // Storage unavailable - fall back to the default rather than fail.
    return LIGHT;
  }

};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle(DARK, theme === DARK);
};

/*
| The same class move, with the app's colour transitions held off around it.
|
| Nothing about which theme is chosen changes here - only how it arrives.
| Without this the cards fade to their new colour over their own duration
| while the canvas behind them repaints at once, and the swap reads as the
| cards lagging.
|
| Reading `offsetHeight` between the two steps is the load bearing line: it
| forces the browser to recompute style and layout there and then, while the
| rule in index.css still has transitions switched off, so the new colours
| are committed with nothing to animate from. By the time the class comes
| off, the elements are already painted and there is no change left to
| transition. Without that read the browser would batch all three steps into
| one recalculation, see the class arrive and leave in the same frame, and
| fade exactly as before.
*/
const applyThemeInstantly = (theme) => {

  const root = document.documentElement;

  root.classList.add(SWITCHING);

  applyTheme(theme);

  void root.offsetHeight;

  root.classList.remove(SWITCHING);

};

/*
| Applied as this module is imported, which happens before the tree is
| mounted in main.jsx. The stored theme is therefore on <html> for React's
| first render instead of arriving an effect later.
*/
applyTheme(readStoredTheme());

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {

  const [theme, setThemeState] = useState(readStoredTheme);

  /*
  | One place writes the class and the stored value, so the two cannot drift
  | apart no matter which caller changed the theme.
  */
  useEffect(() => {

    applyThemeInstantly(theme);

    /*
    | Switched off, so the forced light theme is not written over whatever
    | this device already chose - that preference comes back untouched when
    | the theme is switched on again.
    */
    if (!THEME_ENABLED) return;

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Nothing to persist to - the class above still took effect.
    }

  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next === DARK ? DARK : LIGHT);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === DARK ? LIGHT : DARK));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === DARK,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );

};

export default ThemeProvider;
