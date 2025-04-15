import { useState, useEffect } from "react";
import TeamCard from "../components/TeamCard";
import { teamService } from "../services/teamService";
import { IconShieldPlus, IconUsersPlus } from "@tabler/icons-react";
import TeamPopup from "../components/TeamPopup";
import PlayerPopup from "../components/PlayerPopup";

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showPlayerPopup, setShowPlayerPopup] = useState(false);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await teamService.getAll();
        setTeams(data);
      } catch (err) {
        console.error("Failed to load teams:", err);
      }
    };

    loadTeams();
  }, []);

  return (
    <div class="w-full flex">
      <div class="flex-1 p-4 text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex-1 text-center text-xl font-semibold">Teams</h2>
          <div
            className="cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setShowPopup(true)}
          >
            <IconShieldPlus />
          </div>
          {showPopup && <TeamPopup onClose={() => setShowPopup(false)} />}
        </div>
        <div>
          <ul>
            {teams.map((team) => (
              <li
                className={`mt-2 p-3 rounded cursor-pointer hover:bg-lightblack ${
                  selectedTeam?.id === team.id ? "bg-lightblack" : ""
                }`}
                onClick={() => setSelectedTeam(team)}
              >
                {team.club} {team.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div class="flex-1 p-4 text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex-1 text-center text-xl font-semibold">Players</h2>
          <div
            className="cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setShowPlayerPopup(true)}
          >
            <IconUsersPlus />
          </div>
          {showPlayerPopup && (
            <PlayerPopup
              teamId={selectedTeam?.id}
              onClose={() => setShowPlayerPopup(false)}
            />
          )}
        </div>
        <div>
          <ul>
            {selectedTeam?.players?.map((player) => (
              <li
                className={`mt-2 p-3 rounded cursor-pointer hover:bg-lightblack ${
                  selectedPlayer?.id === player.id ? "bg-lightblack" : ""
                }`}
                onClick={() => setSelectedPlayer(player)}
              >
                {player.shirtNumber} {player.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div class="flex-1 p-4 text-center">
        <h2 className="text-lg font-semibold mb-4">Edit</h2>
        {selectedTeam !== null ? <TeamCard team={selectedTeam} /> : ""}
      </div>
    </div>
  );
}
