import { useEffect, useState } from "react";
import LoginScreen from "./components/LoginScreen.jsx";
import Dashboard from "./components/Dashboard.jsx";
import { loadSession, saveSession, clearSession } from "./lib/auth.js";

// Resolve the theme the page is *actually* showing when nothing is stored:
// the stylesheet is dark by default and only flips light via
// prefers-color-scheme, so read the media query rather than assuming dark.
function systemTheme() {
  return typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem("motorDashTheme");
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {
      /* localStorage throws in some privacy modes — fall through */
    }
    return systemTheme();
  });

  // Restore an unexpired session so a page refresh doesn't kick the
  // operator back out mid-run.
  const [user, setUser] = useState(() => loadSession());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("motorDashTheme", next);
    } catch (e) {
      /* ignore */
    }
  }

  function handleSignIn(nextUser, remember) {
    saveSession(nextUser, remember);
    setUser(nextUser);
  }

  function handleSignOut() {
    clearSession();
    setUser(null);
  }

  // Mounting Dashboard only after sign-in means the data hook — and the
  // simulator interval or serial port it owns — never starts behind the
  // login screen.
  if (!user) {
    return (
      <LoginScreen onSignIn={handleSignIn} theme={theme} onToggleTheme={toggleTheme} />
    );
  }

  return (
    <Dashboard
      user={user}
      onSignOut={handleSignOut}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
