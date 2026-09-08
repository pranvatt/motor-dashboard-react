import { useState } from "react";
import { verify } from "../lib/auth.js";

export default function LoginScreen({ onSignIn, theme, onToggleTheme }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    if (!username.trim() || !password) {
      setError("Enter both a username and a password.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const user = await verify(username, password);
      if (!user) {
        setError("That username and password don't match. Check both and try again.");
        setPassword("");
        setBusy(false);
        return;
      }
      onSignIn(user, remember);
    } catch (err) {
      setError("Sign-in failed. Reload the page and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <button
        className="ghost icon-btn login-theme"
        type="button"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      >
        {theme === "dark" ? "☀" : "☾"}
      </button>

      <div className="login-card">
        <div className="login-head">
          <svg className="login-mark" viewBox="0 0 32 32" aria-hidden="true">
            <circle
              cx="16"
              cy="16"
              r="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            />
            <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="16" y1="4" x2="16" y2="8" />
              <line x1="16" y1="24" x2="16" y2="28" />
              <line x1="4" y1="16" x2="8" y2="16" />
              <line x1="24" y1="16" x2="28" y2="16" />
              <line x1="7.5" y1="7.5" x2="10.2" y2="10.2" />
              <line x1="21.8" y1="21.8" x2="24.5" y2="24.5" />
              <line x1="24.5" y1="7.5" x2="21.8" y2="10.2" />
              <line x1="10.2" y1="21.8" x2="7.5" y2="24.5" />
            </g>
          </svg>
          <h1>Motor Health Monitor</h1>
          <p className="login-sub">
            Sign in to view live readings from the 1 HP single-phase motor.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="login-user">Username</label>
            <input
              id="login-user"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy}
              aria-invalid={error ? "true" : undefined}
            />
          </div>

          <div className="field">
            <label htmlFor="login-pass">Password</label>
            <div className="field-with-action">
              <input
                id="login-pass"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                aria-invalid={error ? "true" : undefined}
              />
              <button
                className="ghost reveal-btn"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            <span>Keep me signed in on this computer</span>
          </label>

          {error && (
            <div className="notice notice-fault" role="alert">
              {error}
            </div>
          )}

          <button className="primary login-submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-hint">
          Demo accounts: <code>operator / motor@123</code> or{" "}
          <code>admin / admin@123</code>. Edit them in{" "}
          <code>src/lib/auth.js</code>.
        </p>
      </div>
    </div>
  );
}
