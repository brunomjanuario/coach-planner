import { useState } from "react";
import { teams } from "../model/mock";
import TeamCard from "../components/TeamCard";

export default function Teams() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div class="w-full flex">
      <div class="flex-1 p-4 text-center">
        <h2 className="text-lg font-semibold mb-4">Teams</h2>
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
        <h2 className="text-lg font-semibold mb-4">Players</h2>
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
