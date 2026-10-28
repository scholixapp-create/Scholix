import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

setBaseUrl(apiUrl);

console.log("VITE_API_URL =", apiUrl);

// Redirect every "/api/..." fetch to Railway
const originalFetch = window.fetch.bind(window);

window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const requestHeaders = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const hasBearerToken = requestHeaders.get("Authorization")?.startsWith("Bearer ") ?? false;

  if (apiUrl) {
    if (typeof input === "string" && input.startsWith("/api")) {
      input = apiUrl + input;
    } else if (input instanceof Request && input.url.startsWith("/api")) {
      input = new Request(apiUrl + input.url, input);
    }
  }

  return originalFetch(input, init).then((response) => {
    if (response.status === 401 && hasBearerToken) {
      window.dispatchEvent(new Event("scholix:auth-invalid"));
    }
    return response;
  });
};

setAuthTokenGetter(() => localStorage.getItem("scholix_token"));

createRoot(document.getElementById("root")!).render(<App />);