import { Route, Routes, Navigate } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Trainings from "./pages/Trainings";
import Games from "./pages/Games";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import { useAuth } from "./context/AuthContext";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null; // or a loading spinner
  return user ? children : <Navigate to="/signin" replace />;
}

function App() {
  return (
    <div className="flex w-screen">
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Sidebar></Sidebar>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/trainings" element={<Trainings />} />
                <Route path="/games" element={<Games />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </PrivateRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
