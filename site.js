const year = document.getElementById("y");
if (year) year.textContent = String(new Date().getFullYear());

/**
 * Replace with the real App Store numeric ID once the listing is live.
 */
const APP_STORE_URL = "https://apps.apple.com/app/id0000000000";

const iosStore = document.getElementById("ios-store");
if (iosStore instanceof HTMLAnchorElement) {
  iosStore.href = APP_STORE_URL;
}
