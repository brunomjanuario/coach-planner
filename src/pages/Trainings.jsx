import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { trainingService } from "../services/trainingService";
import { IconPlus } from "@tabler/icons-react";
import TrainingSavePopup from "../components/TrainingSavePopup";
import TrainingDetailsPopup from "../components/TrainingDetailsPopup";

export default function Trainings() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [futureTrainings, setFutureTrainings] = useState([]);
  const [pastTrainings, setPastTrainings] = useState([]);
  const [showAddTrainingPopup, setShowAddTrainingPopup] = useState(false);
  const [showTrainingDetailsPopup, setShowTrainingDetailsPopup] =
    useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);

  const filterTranings = async (teamId) => {
    const data = await trainingService.getAll();

    const filtered = data.filter((t) => t.teamId === teamId);

    setFutureTrainings(filtered.filter((t) => t.day >= new Date()));
    setPastTrainings(filtered.filter((t) => t.day < new Date()));
  };

  async function selectTeam(team) {
    if (team === selectedTeam) {
      setSelectedTeam(null);

      const data = await trainingService.getAll();
      setFutureTrainings(data.filter((t) => t.day >= new Date()));
      setPastTrainings(data.filter((t) => t.day < new Date()));
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
        setFutureTrainings(data.filter((t) => t.day >= new Date()));
        setPastTrainings(data.filter((t) => t.day < new Date()));
      } catch (err) {
        console.error("Failed to load teams:", err);
      }
    };

    loadTrainings();
  }, []);

  function selectTraining(training) {
    setSelectedTraining(training);
    setShowTrainingDetailsPopup(true);
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex justify-between items-center h-20 flex-shrink-0">
        <h1 className="text-lg font-semibold mb-4 p-4">Trainings</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md m-5"
          onClick={() => setShowAddTrainingPopup(true)}
        >
          <IconPlus />
        </button>
        {showAddTrainingPopup && (
          <TrainingSavePopup
            teamId={selectedTeam?.id}
            onClose={() => setShowAddTrainingPopup(false)}
            onSubmit={() => {
              setShowAddTrainingPopup(false);
            }}
          />
        )}
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 text-center overflow-y-auto min-h-0">
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
        <div className="flex-3 p-4 flex flex-col gap-4 flex-1 min-h-0">
          <h2 className="text-lg font-semibold">Next Trainings</h2>
          <div className="flex-1 flex flex-col rounded border overflow-y-auto min-h-0">
            <ul className="flex-1 overflow-y-auto">
              {futureTrainings.map((training) => (
                <li
                  className={`p-3 rounded cursor-pointer hover:bg-lightblack`}
                  onClick={() => selectTraining(training)}
                >
                  {training.id} {training.day.toString()} {training.duration}
                </li>
              ))}
            </ul>
          </div>

          <h2 className="text-lg font-semibold">Past Trainings</h2>
          <div className="flex-1 flex flex-col rounded border overflow-y-auto min-h-0">
            <ul className="flex-1 overflow-y-auto">
              {pastTrainings.map((training) => (
                <li
                  className={`p-3 rounded cursor-pointer hover:bg-lightblack`}
                  onClick={() => selectTraining(training)}
                >
                  {training.id} {training.day.toString()} {training.duration}
                </li>
              ))}
            </ul>
          </div>
          {showTrainingDetailsPopup && (
            <TrainingDetailsPopup
              training={selectedTraining}
              onClose={() => setShowTrainingDetailsPopup(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
