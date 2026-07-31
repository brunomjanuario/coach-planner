import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { trainingService } from "../services/trainingService";
import { IconPlus } from "@tabler/icons-react";
import TrainingSavePopup from "../components/TrainingSavePopup";
import TrainingDetailsPopup from "../components/TrainingDetailsPopup";
import SelectableListItem from "../components/SelectableListItem";

/** Splits trainings into future/past buckets by comparing `day` to now. */
function splitTrainings(trainings) {
  const now = new Date();
  return {
    future: trainings.filter((t) => t.day >= now),
    past: trainings.filter((t) => t.day < now),
  };
}

export default function Trainings() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [futureTrainings, setFutureTrainings] = useState([]);
  const [pastTrainings, setPastTrainings] = useState([]);
  const [showAddTrainingPopup, setShowAddTrainingPopup] = useState(false);
  const [showTrainingDetailsPopup, setShowTrainingDetailsPopup] =
    useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [createMessage, setCreateMessage] = useState("");
  const [unassignedTrainings, setUnassignedTrainings] = useState([]);

  const loadUnassigned = async () => {
    const data = await trainingService.getUnassigned();
    setUnassignedTrainings(data);
  };

  async function assignTeam(training, teamId) {
    const team = teams.find((t) => String(t.id) === teamId);
    if (!team) return;

    await trainingService.update({ ...training, teamId: team.id });
    await loadUnassigned();
    await filterTrainings(selectedTeam?.id ?? null);
  }

  function teamLabel(id) {
    const team = teams.find((t) => t.id === id);
    return team ? `${team.club} ${team.name}` : "an unknown team";
  }

  const filterTrainings = async (teamId) => {
    const data = await trainingService.getAll();
    const filtered = teamId ? data.filter((t) => t.teamId === teamId) : data;

    const { future, past } = splitTrainings(filtered);
    setFutureTrainings(future);
    setPastTrainings(past);
  };

  async function selectTeam(team) {
    if (team === selectedTeam) {
      setSelectedTeam(null);
      await filterTrainings(null);
      return;
    }

    setSelectedTeam(team);
    await filterTrainings(team.id);
  }

  useEffect(() => {
    async function loadTeamsAndTrainings() {
      try {
        const data = await teamService.getAll();
        setTeams(data);
      } catch (err) {
        console.error("Failed to load teams:", err);
      }

      try {
        const data = await trainingService.getAll();
        const { future, past } = splitTrainings(data);
        setFutureTrainings(future);
        setPastTrainings(past);
      } catch (err) {
        console.error("Failed to load trainings:", err);
      }
    }

    loadTeamsAndTrainings();
    loadUnassigned();
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
          onClick={() => {
            setCreateMessage("");
            setShowAddTrainingPopup(true);
          }}
        >
          <IconPlus />
        </button>
        {showAddTrainingPopup && (
          <TrainingSavePopup
            teamId={selectedTeam?.id}
            onClose={() => {
              setShowAddTrainingPopup(false);
              filterTrainings(selectedTeam?.id ?? null);
            }}
            onSubmit={async (training) => {
              const created = await trainingService.create(training);
              await filterTrainings(selectedTeam?.id ?? null);
              if (selectedTeam && created.teamId !== selectedTeam.id) {
                setCreateMessage(
                  `Training created for ${teamLabel(created.teamId)} — it won't show under the "${teamLabel(selectedTeam.id)}" filter.`
                );
              } else {
                setCreateMessage("");
              }
            }}
          />
        )}
      </div>
      {createMessage && (
        <p className="text-sm text-yellow-500 px-4 pb-2">{createMessage}</p>
      )}
      {unassignedTrainings.length > 0 && (
        <div className="px-4 pb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-2">Unassigned</h2>
          <ul>
            {unassignedTrainings.map((training) => (
              <li
                key={training.id}
                className="flex items-center justify-between gap-2 p-2 border rounded mb-2"
              >
                <span>
                  {training.day.toString()} {training.duration}
                </span>
                <select
                  className="border px-2 py-1 rounded"
                  value=""
                  onChange={(e) => assignTeam(training, e.target.value)}
                >
                  <option value="" disabled>
                    Assign to team
                  </option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.club} {team.name}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-4 text-center overflow-y-auto min-h-0">
          {teams.length === 0 ? (
            <p>No teams yet.</p>
          ) : (
            <ul>
              {teams.map((team) => (
                <SelectableListItem
                  key={team.id}
                  selected={selectedTeam?.id === team.id}
                  onSelect={() => selectTeam(team)}
                >
                  {team.club} {team.name}
                </SelectableListItem>
              ))}
            </ul>
          )}
        </div>
        <div className="flex-3 p-4 flex flex-col gap-4 flex-1 min-h-0">
          <h2 className="text-lg font-semibold">Next Trainings</h2>
          <div className="flex-1 flex flex-col rounded border overflow-y-auto min-h-0">
            {futureTrainings.length === 0 ? (
              <p className="p-3">No upcoming trainings.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {futureTrainings.map((training) => (
                  <li
                    key={training.id}
                    className={`p-3 rounded cursor-pointer hover:bg-lightblack`}
                    onClick={() => selectTraining(training)}
                  >
                    {training.id} {training.day.toString()}{" "}
                    {training.duration}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2 className="text-lg font-semibold">Past Trainings</h2>
          <div className="flex-1 flex flex-col rounded border overflow-y-auto min-h-0">
            {pastTrainings.length === 0 ? (
              <p className="p-3">No past trainings.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {pastTrainings.map((training) => (
                  <li
                    key={training.id}
                    className={`p-3 rounded cursor-pointer hover:bg-lightblack`}
                    onClick={() => selectTraining(training)}
                  >
                    {training.id} {training.day.toString()}{" "}
                    {training.duration}
                  </li>
                ))}
              </ul>
            )}
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
