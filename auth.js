/* ============================================================
   Sign-in gate for the dashboard.

   IMPORTANT — this is a *gate*, not security. The project is a static
   Vite bundle that talks to the ESP32 over USB serial; there is no
   server to check a password against, so the accounts below ship inside
   the JavaScript and anyone who opens devtools can read them. That is
   fine for a bench/lab console on a local machine.

   If this dashboard ever goes on a network, replace the body of
   `verify()` with a call to a real endpoint, e.g.

     export async function verify(username, password) {
       const r = await fetch("/api/login", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ username, password })
       });
       if (!r.ok) return null;
       return r.json();          // { username, name, role }
     }

   Nothing else in the app needs to change — App.jsx only ever awaits
   this one function.
   ============================================================ */

const ACCOUNTS = [
  {
    username: "operator",
    password: "motor@123",
    name: "Plant Operator",
    role: "operator"
  },
  {
    username: "admin",
    password: "admin@123",
    name: "Maintenance Admin",
    role: "admin"
  },
  {
    username: "psingh14_be23@thapar.edu",
    password: "12345678",
    name: "P. Singh",
    role: "operator"
  }
];

const SESSION_KEY = "motorDashSession";
const SESSION_HOURS = 12;

/** Resolve a username/password pair to a user object, or null. */
export async function verify(username, password) {
  // Small delay so the button's "Signing in…" state is visible and so
  // guessing is a little slower. Swap this whole body for a fetch later.
  await new Promise((r) => setTimeout(r, 350));

  const u = String(username).trim().toLowerCase();
  const match = ACCOUNTS.find(
    (acc) => acc.username === u && acc.password === password
  );
  if (!match) return null;

  return { username: match.username, name: match.name, role: match.role };
}

function store(remember) {
  return remember ? window.localStorage : window.sessionStorage;
}

/** Read a still-valid session from storage, or null. */
export function loadSession() {
  for (const s of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = s.getItem(SESSION_KEY);
      if (!raw) continue;
      const session = JSON.parse(raw);
      if (!session.user || !session.expires) continue;
      if (Date.now() > session.expires) {
        s.removeItem(SESSION_KEY);
        continue;
      }
      return session.user;
    } catch (e) {
      /* corrupt entry or storage blocked in private mode — ignore */
    }
  }
  return null;
}

/** Persist a session. `remember` keeps it across browser restarts. */
export function saveSession(user, remember) {
  const payload = JSON.stringify({
    user,
    expires: Date.now() + SESSION_HOURS * 60 * 60 * 1000
  });
  try {
    store(remember).setItem(SESSION_KEY, payload);
    // Make sure the other store doesn't hold a stale copy.
    store(!remember).removeItem(SESSION_KEY);
  } catch (e) {
    /* storage unavailable — the session just won't survive a reload */
  }
}

export function clearSession() {
  for (const s of [window.localStorage, window.sessionStorage]) {
    try {
      s.removeItem(SESSION_KEY);
    } catch (e) {
      /* ignore */
    }
  }
}
