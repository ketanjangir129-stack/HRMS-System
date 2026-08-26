import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import useAuth from "../hooks/useAuth";

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

/*
|--------------------------------------------------------------------------
| Signed out is always light
|--------------------------------------------------------------------------
| The toggle lives in the navbar, and the navbar only exists behind a login.
| So on the register, login, change-password and public on-boarding screens
| the theme would be applied with no way to leave it - somebody who last
| signed out in the dark would be handed a dark login page and nothing to
| press. Those screens are pinned to light instead.
|
| The preference itself is untouched by this: it stays in storage through the
| whole signed out stretch and the dashboard comes back in the theme it was
| left in.
|
| It is keyed on the session rather than on the path because two of those
| four screens are not guarded routes, and a route list is one more thing to
| keep in step. `companyCode` is the same key ProtectedRoute and GuestRoute
| read, so the theme and the routing can never disagree about who is in.
|--------------------------------------------------------------------------
*/

const SESSION_KEY = "companyCode";

const hasStoredSession = () => {

  try {
    return Boolean(localStorage.getItem(SESSION_KEY));
  } catch {
    // Storage unavailable - nothing can be signed in from it either.
    return false;
  }

};

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
|
| The session is read here as well, for the same reason the theme is: waiting
| for the provider to work it out would paint one dark frame of the login
| screen on a device that last signed out in the dark.
*/
applyTheme(hasStoredSession() ? readStoredTheme() : LIGHT);

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {

  const { currentUser, loading } = useAuth();

  const [theme, setThemeState] = useState(readStoredTheme);

  /*
  | Who is signed in, answered twice over.
  |
  | `currentUser` is the real answer, but it arrives a round trip late -
  | restoring a session waits on Firebase and on the company lookup. Reading
  | it while that is still in flight would say "nobody" on every refresh, and
  | a signed in employee would watch their dashboard start light and turn
  | dark a moment later.
  |
  | So while the restore is running the stored session stands in for it. It
  | is the same key the route guards decide on, so the frame it paints is the
  | one the router is about to agree with, and by the time it is replaced the
  | two say the same thing.
  */
  const signedIn = loading ? hasStoredSession() : Boolean(currentUser);

  /*
  | What is actually on screen. The preference is only honoured behind a
  | login; everywhere else it is held aside rather than forgotten.
  */
  const appliedTheme = signedIn ? theme : LIGHT;

  useEffect(() => {
    applyThemeInstantly(appliedTheme);
  }, [appliedTheme]);

  /*
  | Persisted separately from the class above, and keyed on the preference
  | rather than on what is showing: signing out must not write the light it
  | forces over the dark the user chose.
  */
  useEffect(() => {

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

  /*
  | Both read from what is applied, not from what is stored, so a caller and
  | the page can never disagree - the navbar's sun and moon is the clearest
  | case, and it is the one control that would look wrong.
  */
  const value = useMemo(
    () => ({
      theme: appliedTheme,
      isDark: appliedTheme === DARK,
      setTheme,
      toggleTheme,
    }),
    [appliedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );

};

export default ThemeProvider;
