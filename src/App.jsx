import { Route, Routes } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Trainings from "./pages/Trainings";
import Games from "./pages/Games";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";

function App() {
  return (
    <div className="flex">
      <Sidebar></Sidebar>
      <main className="p-5 w-80">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/trainings" element={<Trainings />} />
          <Route path="/games" element={<Games />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
