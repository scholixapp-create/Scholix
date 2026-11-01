export function passwordResetLink(frontendUrl: string, token: string): string {
  const base = frontendUrl.replace(/\/+$/, "");
  const url = new URL(`${base}/reset-password`);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("FRONTEND_URL must be an HTTP(S) URL");
  }
  url.searchParams.set("token", token);
  return url.toString();
}
