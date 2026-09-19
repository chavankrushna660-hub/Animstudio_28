import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { runSecurityShield } from "./utils/securityGuard";
import App from "./App";

export default function AnimStudioClient() {
  useEffect(() => {
    runSecurityShield();
  }, []);

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
