import { Navigate, Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { StartList } from "./pages/StartList";
import { Measurement } from "./pages/Measurement";
import { Results } from "./pages/Results";
import { Running } from "./pages/Running";
import { PublishTargets } from "./pages/PublishTargets";
import { Conflicts } from "./pages/Conflicts";
import { EmbedResults } from "./pages/EmbedResults";
import { Kiosk } from "./pages/Kiosk";
import { AuditLog } from "./pages/AuditLog";
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
      <Route path="/vysledky/:routeId" element={<Results />} />
      <Route path="/embed/vysledky/:routeId" element={<EmbedResults />} />
      <Route path="/kiosk/:routeId" element={<Kiosk />} />
      <Route
        path="/audit/:routeId"
        element={
          <RequireAuth>
            <AuditLog />
          </RequireAuth>
        }
      />
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
      <Route
        path="/kdo-bezi/:routeId"
        element={
          <RequireAuth>
            <Running />
          </RequireAuth>
        }
      />
      <Route
        path="/publikace/:eventId"
        element={
          <RequireAuth>
            <PublishTargets />
          </RequireAuth>
        }
      />
      <Route
        path="/konflikty/:routeId"
        element={
          <RequireAuth>
            <Conflicts />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
