import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { OnboardingWizard } from "./pages/OnboardingWizard";
import "./styles.css";

// The platform provisioning console lives at /?onboard — it is not tenant-scoped.
const isOnboard = new URLSearchParams(window.location.search).has("onboard");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isOnboard ? <OnboardingWizard /> : <App />}
  </React.StrictMode>
);
