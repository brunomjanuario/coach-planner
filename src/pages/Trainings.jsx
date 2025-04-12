import { useState } from "react";
import { teams } from "../model/mock";

export default function Trainings() {
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <div className="w-full">
      <h1 className="text-lg font-semibold mb-4 p-4">Trainings</h1>

      <div className="flex">
        <div class="flex-1 p-4 text-center">
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

        <div className="flex-3 p-4 h-full">
          <div className="h-[50%]">
            <h2 className="text-lg font-semibold mt-2">Next Trainings</h2>
            <div className="rounded border h-60">Trains</div>
          </div>

          <div className="h-[50%]">
            <h2 className="text-lg font-semibold mt-4">Past Trainings</h2>
            <div className="rounded border h-60">Done</div>
          </div>
        </div>
      </div>
    </div>
  );
}
