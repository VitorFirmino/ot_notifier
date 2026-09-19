import { lazy, Suspense, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { authClient } from "@lib/authClient";
import { AppLoadingScreen } from "@components/AppLoadingScreen";

const AuthenticatedApp = lazy(() => import("./AuthenticatedApp"));
const LoginView = lazy(() => import("@components/LoginView").then((mod) => ({ default: mod.LoginView })));
const ResetPasswordView = lazy(() =>
  import("@components/ResetPasswordView").then((mod) => ({ default: mod.ResetPasswordView }))
);

export default function App() {
  const location = useLocation();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const [hasResolvedSessionOnce, setHasResolvedSessionOnce] = useState(false);

  if (!isSessionLoading && !hasResolvedSessionOnce) {
    setHasResolvedSessionOnce(true);
  }

  if (location.pathname === "/app/reset-password") {
    return (
      <Suspense fallback={<AppLoadingScreen />}>
        <ResetPasswordView />
      </Suspense>
    );
  }

  if (isSessionLoading && !hasResolvedSessionOnce) {
    return <AppLoadingScreen />;
  }

  if (!session) {
    if (location.pathname !== "/app/login") {
      return <Navigate to="/app/login" replace />;
    }
    return (
      <Suspense fallback={<AppLoadingScreen />}>
        <LoginView />
      </Suspense>
    );
  }

  if (location.pathname === "/app/login") {
    return <Navigate to="/app" replace />;
  }

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <AuthenticatedApp />
    </Suspense>
  );
}
