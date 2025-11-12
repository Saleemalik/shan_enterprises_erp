// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import Dealers from "./pages/Dealers";
import Places from "./pages/Places";
import Destination from "./pages/Destination";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
         <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="destinations" element={<Destination />} />
          <Route path="places" element={<Places />} />
          <Route path="dealers" element={<Dealers />} />
        </Route>
      </Routes>
    </Router>
  );
}
