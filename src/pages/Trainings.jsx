import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { trainingService } from "../services/trainingService";

export default function Trainings() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [trainings, setTrainings] = useState([]);

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

  useEffect(() => {
    const loadTrainings = async () => {
      try {
        const data = await trainingService.getAll();
        setTrainings(data);
      } catch (err) {
        console.error("Failed to load teams:", err);
      }
    };

    loadTrainings();
  }, []);

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
          <div className="h-[50%] rounded border">
            <h2 className="text-lg font-semibold p-3">Next Trainings</h2>
            <div className="">
              <ul>
                {trainings.map((training) => (
                  <li
                    className={`p-3 rounded cursor-pointer hover:bg-lightblack`}
                  >
                    {training.id} {training.day.toString()} {training.duration}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="h-[50%]">
            <h2 className="text-lg font-semibold mt-4">Past Trainings</h2>
            <div className="rounded border h-60">
              <ul>
                {trainings.map((training) => (
                  <li
                    className={`p-3 rounded cursor-pointer hover:bg-lightblack`}
                  >
                    {training.id} {training.day.toString()} {training.duration}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
