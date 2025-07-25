import {
  IconCalendarWeek,
  IconHome,
  IconLogout,
  IconPlayFootball,
  IconSettings,
  IconSoccerField,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    signOut();
    navigate("/signin");
  };

  return (
    <div className="h-screen w-15 text-white flex flex-col p-4 items-center border-r bg-lightblack">
      <nav className="flex flex-col gap-4">
        <Link to="/" className="mt-2 p-3 group relative inline-block">
          <IconHome size={30} />
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Home
          </div>
        </Link>
        <Link to="/teams" className="mt-2 p-3 group relative inline-block">
          <IconUsersGroup size={30} />
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Teams
          </div>
        </Link>
        <Link to="/trainings" className="mt-2 p-3 group relative inline-block">
          <IconPlayFootball size={30} />
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Trainings
          </div>
        </Link>
        <Link to="/games" className="mt-2 p-3 group relative inline-block">
          <IconSoccerField size={30} />
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Games
          </div>
        </Link>
        <Link to="/calendar" className="mt-2 p-3 group relative inline-block">
          <IconCalendarWeek size={30} />
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Calendar
          </div>
        </Link>
        <Link to="/settings" className="mt-2 p-3 group relative inline-block">
          <IconSettings size={30} />
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Settings
          </div>
        </Link>
        <div onClick={handleLogout}>
          <Link to="/" className="mt-2 p-3 group relative inline-block">
            <IconLogout size={30} />
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Logout
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
