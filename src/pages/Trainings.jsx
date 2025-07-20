import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { trainingService } from "../services/trainingService";

export default function Trainings() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [trainings, setTrainings] = useState([]);

  const filterTranings = async (teamId) => {
    const data = await trainingService.getAll();

    const filtered = data.filter((t) => t.teamId === teamId);

    setTrainings(filtered);
  };

  async function selectTeam(team) {
    if (team === selectedTeam) {
      setSelectedTeam(null);

      const data = await trainingService.getAll();
      setTrainings(data);
      return;
    }

    setSelectedTeam(team);
    filterTranings(team.id);
  }

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

      <div className="flex h-80">
        <div className="flex-1 p-4 text-center">
          <div>
            <ul>
              {teams.map((team) => (
                <li
                  className={`mt-2 p-3 rounded cursor-pointer hover:bg-lightblack ${
                    selectedTeam?.id === team.id ? "bg-lightblack" : ""
                  }`}
                  onClick={() => selectTeam(team)}
                >
                  {team.club} {team.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex-3 p-4">
          <h2 className="text-lg font-semibold">Next Trainings</h2>
          <div className="h-[50%] rounded border">
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
