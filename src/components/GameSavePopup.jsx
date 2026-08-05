import { useId, useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { opponentService } from "../services/opponentService";
import { competitionService } from "../services/competitionService";
import { toInputValue, fromInputValue } from "../lib/datetime";
import { toOptions } from "../lib/selectOptions";
import PopupShell from "./PopupShell";
import OpponentsPopup from "./OpponentsPopup";
import CompetitionsPopup from "./CompetitionsPopup";

const ADD_NEW_OPPONENT = "__add_new_opponent__";
const ADD_NEW_COMPETITION = "__add_new_competition__";

export default function GameSavePopup({ game, teamId, onClose, onSubmit }) {
  const formId = useId();
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [opponents, setOpponents] = useState([]);
  const [loadingOpponents, setLoadingOpponents] = useState(true);
  const [competitions, setCompetitions] = useState([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [error, setError] = useState("");
  const [showOpponentsManager, setShowOpponentsManager] = useState(false);
  const [showCompetitionsManager, setShowCompetitionsManager] = useState(false);
  const [formData, setFormData] = useState(() => ({
    id: game?.id,
    teamId: game?.teamId ?? null,
    opponent: game?.opponent ?? "",
    date: game
      ? toInputValue(game.date instanceof Date ? game.date : new Date(game.date))
      : "",
    isHome: game?.isHome ?? true,
    competition: game?.competition ?? "",
  }));

  useEffect(() => {
    async function loadTeams() {
      try {
        const data = await teamService.getAll();
        setTeams(data);
        if (
          game == null &&
          teamId != null &&
          data.some((team) => team.id === teamId)
        ) {
          setFormData((prev) => ({ ...prev, teamId }));
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
      } finally {
        setLoadingTeams(false);
      }
    }

    async function loadOpponents() {
      try {
        setOpponents(await opponentService.getAll());
      } catch (err) {
        console.error("Failed to load opponents:", err);
      } finally {
        setLoadingOpponents(false);
      }
    }

    async function loadCompetitions() {
      try {
        setCompetitions(await competitionService.getAll());
      } catch (err) {
        console.error("Failed to load competitions:", err);
      } finally {
        setLoadingCompetitions(false);
      }
    }

    loadTeams();
    loadOpponents();
    loadCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "teamId") {
      if (error) setError("");
      const matched = teams.find((team) => String(team.id) === value);
      setFormData((prev) => ({ ...prev, teamId: matched ? matched.id : null }));
      return;
    }

    if (name === "opponent") {
      if (value === ADD_NEW_OPPONENT) {
        setShowOpponentsManager(true);
        return;
      }
      if (error) setError("");
    }

    if (name === "competition" && value === ADD_NEW_COMPETITION) {
      setShowCompetitionsManager(true);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /**
   * Re-reads the list after the stacked manager closes; a name added while
   * it was open becomes the selected value with no second interaction
   * (edge case). Closing without adding anything leaves the form untouched.
   */
  const handleCloseOpponentsManager = async () => {
    setShowOpponentsManager(false);
    const previousNames = new Set(opponents.map((o) => o.name));
    const data = await opponentService.getAll();
    setOpponents(data);
    const added = data.find((o) => !previousNames.has(o.name));
    if (added) {
      setFormData((prev) => ({ ...prev, opponent: added.name }));
    }
  };

  const handleCloseCompetitionsManager = async () => {
    setShowCompetitionsManager(false);
    const previousNames = new Set(competitions.map((c) => c.name));
    const data = await competitionService.getAll();
    setCompetitions(data);
    const added = data.find((c) => !previousNames.has(c.name));
    if (added) {
      setFormData((prev) => ({ ...prev, competition: added.name }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.teamId) {
      setError("Please select a team.");
      return;
    }

    if (!formData.opponent) {
      setError("Please enter the opponent.");
      return;
    }

    const date = fromInputValue(formData.date);
    if (!date || isNaN(date.getTime())) {
      setError("Please enter a valid date and time.");
      return;
    }

    setError("");
    try {
      if (onSubmit) {
        await onSubmit({
          id: formData.id,
          teamId: formData.teamId,
          opponent: formData.opponent,
          date,
          isHome: Boolean(formData.isHome),
          competition: formData.competition,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to save game:", err);
      setError("Failed to save the game. Please try again.");
    }
  };

  const opponentOptions = toOptions(opponents, formData.opponent);
  // A case-only-different legacy value must render as its list entry, not a
  // blank selection — the <select>'s displayed value is the matching
  // option's exact casing, while formData.opponent (what gets submitted)
  // stays untouched until the coach actually changes the selection.
  const opponentSelectValue =
    opponentOptions.find(
      (option) => option.value.toLowerCase() === formData.opponent.toLowerCase()
    )?.value ?? formData.opponent;

  const competitionOptions = toOptions(competitions, formData.competition);
  const competitionSelectValue =
    competitionOptions.find(
      (option) => option.value.toLowerCase() === formData.competition.toLowerCase()
    )?.value ?? formData.competition;

  return (
    <>
      <PopupShell
        title={game ? "Edit Game" : "Create Game"}
        footer={
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-white rounded"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {game ? "Save" : "Create"}
            </button>
          </div>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="teamId" className="block text-sm font-medium">
              Team
            </label>
            <select
              id="teamId"
              name="teamId"
              value={formData.teamId ?? ""}
              onChange={handleChange}
              disabled={loadingTeams || teams.length === 0}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.club} {team.name}
                </option>
              ))}
            </select>
            {!loadingTeams && teams.length === 0 && (
              <p className="text-sm text-red-500">
                No teams yet. Add one on the Teams page first.
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div>
            <label htmlFor="opponent" className="block text-sm font-medium">
              Opponent
            </label>
            <select
              id="opponent"
              name="opponent"
              value={opponentSelectValue}
              onChange={handleChange}
              disabled={loadingOpponents}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">Select an opponent</option>
              {opponentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.inList ? option.label : `${option.label} (not in list)`}
                </option>
              ))}
              <option value={ADD_NEW_OPPONENT}>Add new…</option>
            </select>
            {!loadingOpponents && opponents.length === 0 && (
              <p className="text-sm text-red-500">
                No opponents yet. Add one from the Opponents manager on the
                Games page first.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium">Date & Time</label>
            <input
              type="datetime-local"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isHome"
              type="checkbox"
              name="isHome"
              checked={Boolean(formData.isHome)}
              onChange={handleChange}
            />
            <label htmlFor="isHome" className="text-sm font-medium">
              Home game
            </label>
          </div>
          <div>
            <label htmlFor="competition" className="block text-sm font-medium">
              Competition
            </label>
            <select
              id="competition"
              name="competition"
              value={competitionSelectValue}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
            >
              <option value="">None</option>
              {competitionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.inList ? option.label : `${option.label} (not in list)`}
                </option>
              ))}
              <option value={ADD_NEW_COMPETITION}>Add new…</option>
            </select>
            {!loadingCompetitions && competitions.length === 0 && (
              <p className="text-sm text-red-500">
                No competitions yet. Add one from the Competitions manager on
                the Games page first.
              </p>
            )}
          </div>
        </form>
      </PopupShell>
      {showOpponentsManager && (
        <OpponentsPopup onClose={handleCloseOpponentsManager} />
      )}
      {showCompetitionsManager && (
        <CompetitionsPopup onClose={handleCloseCompetitionsManager} />
      )}
    </>
  );
}
