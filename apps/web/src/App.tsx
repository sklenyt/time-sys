import { Route, Routes } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { StartList } from "./pages/StartList";
import { Measurement } from "./pages/Measurement";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/startovni-listina/:routeId" element={<StartList />} />
      <Route path="/mereni/:routeId" element={<Measurement />} />
    </Routes>
  );
}
