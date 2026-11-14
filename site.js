const year = document.getElementById("y");
if (year) year.textContent = String(new Date().getFullYear());

const APP_STORE_URL = "https://apps.apple.com/app/aubital/id6834113636";

const iosStore = document.getElementById("ios-store");
if (iosStore instanceof HTMLAnchorElement) {
  iosStore.href = APP_STORE_URL;
}
