const KEY = "vaal_admin_authed";

export function isAdminAuthed(): boolean {
  return localStorage.getItem(KEY) === "true";
}

export function setAdminAuthed(value: boolean) {
  localStorage.setItem(KEY, value ? "true" : "false");
}

export function logoutAdmin() {
  localStorage.removeItem(KEY);
}
