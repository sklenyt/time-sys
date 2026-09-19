import { Navigate, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { StartList } from "./pages/StartList";
import { Measurement } from "./pages/Measurement";
import { isLoggedIn } from "./lib/api";

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/startovni-listina/:routeId"
        element={
          <RequireAuth>
            <StartList />
          </RequireAuth>
        }
      />
      <Route
        path="/mereni/:routeId"
        element={
          <RequireAuth>
            <Measurement />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
