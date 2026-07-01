import { setBaseUrl } from "@workspace/api-client-react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setBaseUrl(import.meta.env.VITE_API_URL ?? "");

setAuthTokenGetter(() => localStorage.getItem("scholix_token"));

createRoot(document.getElementById("root")!).render(<App />);
