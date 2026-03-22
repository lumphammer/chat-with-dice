import {
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIES_ACCEPTED,
  COOKIES_REJECTED,
} from "#/constants";
import { useEffect, useState } from "react";

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  // listen to localstorage and set isVisible accordingly
  useEffect(() => {
    if (localStorage.getItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY) === null) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY, COOKIES_ACCEPTED);
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.clear();
    localStorage.setItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY, COOKIES_REJECTED);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="bg-accent-tint/50 fixed right-0 bottom-0 left-0 z-50 p-4
        shadow-lg backdrop-blur"
    >
      <div className="mx-auto max-w-4xl">
        <div
          className="flex flex-col gap-4 sm:flex-row sm:items-center
            sm:justify-between"
        >
          <div className="flex-1">
            <p className="text-base-content text-sm">
              This site uses cookies and local storage to remember your
              preferences. Without these, some parts of the site may be very
              weird. We do not use tracking or advertising cookies.{" "}
              <a className="cursor-pointer underline" href="/cookie-policy">
                Cookie Policy
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="btn btn-sm btn-ghost"
              aria-label="Reject cookies"
            >
              Reject
            </button>
            <button
              onClick={handleAccept}
              className="btn btn-sm btn-accent"
              aria-label="Accept cookies"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
