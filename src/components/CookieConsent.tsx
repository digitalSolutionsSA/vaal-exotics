import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ACCEPTED_KEY = "ve_cookie_consent_accepted";
const DECLINED_UNTIL_KEY = "ve_cookie_consent_declined_until";

// change this if you want a different cooldown after declining
const DECLINE_COOLDOWN_HOURS = 12;

export default function CookieConsent() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(ACCEPTED_KEY);
      const declinedUntilRaw = localStorage.getItem(DECLINED_UNTIL_KEY);
      const declinedUntil = declinedUntilRaw ? Number(declinedUntilRaw) : 0;

      // accepted once = don't show again
      if (accepted === "true") {
        setVisible(false);
        return;
      }

      // declined = hide until cooldown expires
      if (declinedUntil > Date.now()) {
        setVisible(false);
        return;
      }

      // otherwise show on load
      setVisible(true);
    } catch {
      // fallback in case localStorage has issues
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(ACCEPTED_KEY, "true");
      localStorage.removeItem(DECLINED_UNTIL_KEY);
    } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      const cooldownMs = DECLINE_COOLDOWN_HOURS * 60 * 60 * 1000;
      localStorage.setItem(
        DECLINED_UNTIL_KEY,
        String(Date.now() + cooldownMs)
      );
      localStorage.removeItem(ACCEPTED_KEY);
    } catch {}
    setVisible(false);
  };

  const handleDisclaimer = () => {
    navigate("/disclaimer");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/45 px-4 pb-4 sm:pb-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#102235] text-white shadow-2xl">
        <div className="p-5 sm:p-6">
          <h2
            id="cookie-consent-title"
            className="text-lg sm:text-xl font-bold"
          >
            Cookie Consent
          </h2>

          <p
            id="cookie-consent-description"
            className="mt-3 text-sm sm:text-[15px] leading-6 text-white/85"
          >
            We use cookies and similar technologies to help the website function,
            improve performance, remember preferences, and support a better user
            experience. By clicking <strong>Accept</strong>, you agree to the use
            of cookies. By clicking <strong>Decline</strong>, non-essential cookie
            use is declined and the notice may appear again later.
          </p>

          <p className="mt-3 text-sm sm:text-[15px] leading-6 text-white/75">
            Please read our full disclaimer before continuing if you want the
            complete terms and important legal information.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              onClick={handleAccept}
              className="rounded-xl bg-[#C43A2F] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Accept
            </button>

            <button
              onClick={handleDecline}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Decline
            </button>

            <button
              onClick={handleDisclaimer}
              className="rounded-xl border border-[#2F4D7A] bg-[#2F4D7A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Full Disclaimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}