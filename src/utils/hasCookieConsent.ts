import {
  COOKIE_CONSENT_LOCAL_STORAGE_KEY,
  COOKIES_ACCEPTED,
} from "#/constants";

export function hasCookieConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const consent = localStorage.getItem(COOKIE_CONSENT_LOCAL_STORAGE_KEY);
  return consent === COOKIES_ACCEPTED;
}
