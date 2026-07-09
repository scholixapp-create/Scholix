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
  if (apiUrl) {
    if (typeof input === "string" && input.startsWith("/api")) {
      input = apiUrl + input;
    } else if (input instanceof Request && input.url.startsWith("/api")) {
      input = new Request(apiUrl + input.url, input);
    }
  }

  return originalFetch(input, init);
};

setAuthTokenGetter(() => localStorage.getItem("scholix_token"));

createRoot(document.getElementById("root")!).render(<App />);