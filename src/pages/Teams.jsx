import { useState } from "react";

const teams = [
  { id: 1, name: "Barcelona", players: ["Messi", "Xavi", "Iniesta"] },
  { id: 2, name: "Real Madrid", players: ["Ronaldo", "Modric", "Benzema"] },
  { id: 3, name: "Liverpool", players: ["Salah", "Van Dijk", "Alisson"] },
];

export default function Teams() {
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <div className="flex w-[100%]">
      <div className="w-1/3 bg-gray text-white p-4">
        <h2 className="text-lg font-semibold mb-4">Teams</h2>
        <ul className="space-y-2">
          {teams.map((team) => (
            <li
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className={`cursor-pointer p-3 rounded hover:bg-gray-700 ${
                selectedTeam?.id === team.id ? "bg-gray-900" : ""
              }`}
            >
              {team.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 bg-gray p-6">
        <h2 className="text-lg font-semibold mb-4">Players</h2>
        {selectedTeam ? (
          <ul className="space-y-2">
            {selectedTeam.players.map((player, idx) => (
              <li key={idx} className="border p-3 rounded shadow-sm">
                {player}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Select a team to view its players.</p>
        )}
      </div>
    </div>
  );
}
