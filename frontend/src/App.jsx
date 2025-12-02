// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import Dealers from "./pages/Dealers";
import Places from "./pages/Places";
import Destinations from "./pages/Destinations";
import RateRanges from "./pages/RateRanges";
import DestinationEntries from "./pages/DestinationEntries";
import DestinationEntryCreate from "./pages/DestinationEntryCreate";
import DestinationEntryEdit from "./pages/DestinationEntryEdit";

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
          <Route path="destinations" element={<Destinations />} />
          <Route path="places" element={<Places />} />
          <Route path="rate-ranges" element={<RateRanges />} />
          <Route path="dealers" element={<Dealers />} />
          <Route path="destination-entries" >
            <Route index element={<DestinationEntries />} />
            <Route path="create" element={<DestinationEntryCreate />} />
            <Route path=":id" element={<DestinationEntryEdit />} />
          </Route> 
        </Route>
      </Routes>
    </Router>
  );
}
