import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

/*
|--------------------------------------------------------------------------
| Theme
|--------------------------------------------------------------------------
| The current theme and the two ways to change it:
|
|   const { theme, isDark, setTheme, toggleTheme } = useTheme();
|
| `theme` is always "light" or "dark" - never null and never "system" - so a
| caller can read it without a fallback. `isDark` is the same answer for the
| callers that only want a boolean.
|
| `setTheme` takes an explicit value and `toggleTheme` flips the current one;
| both write the <html> class and the stored preference through the provider.
|--------------------------------------------------------------------------
*/

const useTheme = () => {

  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider"
    );
  }

  return context;

};

export default useTheme;
