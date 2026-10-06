import { useEffect, useState } from "react";
import { useAccount, peekFlash, clearFlash } from "./lib/account";

// Home-page nudge while this browser is still anonymous, plus the one-shot
// note after a second device signs in. Quiet once bound.
export function AccountBand() {
  const { user, bind, busy, error } = useAccount();
  const [flash] = useState(peekFlash);
  useEffect(() => {
    if (flash) clearFlash();
  }, [flash]);

  if (flash) {
    return (
      <section className="acct-band acct-done" aria-live="polite">
        <p className="acct-copy">{flash}</p>
      </section>
    );
  }
  if (!user || !user.anonymous) return null;

  return (
    <section className="acct-band" aria-label="Keep your Hearth">
      <div className="acct-copy">
        <span className="acct-eyebrow">Unbound</span>
        <p>
          This Hearth only lives in this browser. Clear your data and it&rsquo;s gone, and your
          other devices can&rsquo;t see it. Bind it to Google and it stays put.
        </p>
        {error && <p className="acct-err" role="alert">{error}</p>}
      </div>
      <button type="button" className="acct-btn" onClick={bind} disabled={busy}>
        {busy ? "Binding…" : "Bind to Google"}
      </button>
    </section>
  );
}

// Footer line: who the Hearth belongs to.
export function AccountNote() {
  const { user } = useAccount();
  if (!user) return null;
  return <span>{user.anonymous ? "Unbound · this browser only" : `Bound · ${user.email || "Google"}`}</span>;
}
