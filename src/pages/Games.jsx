import { useState, useEffect } from "react";
import { teamService } from "../services/teamService";
import { gameService } from "../services/gameService";
import { IconPlus } from "@tabler/icons-react";
import GameSavePopup from "../components/GameSavePopup";
import GameResultPopup from "../components/GameResultPopup";
import GameRow from "../components/GameRow";
import SelectableListItem from "../components/SelectableListItem";

export default function Games() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teams, setTeams] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);
  const [playedGames, setPlayedGames] = useState([]);
  const [showAddGamePopup, setShowAddGamePopup] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [unassignedGames, setUnassignedGames] = useState([]);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const loadUnassigned = async () => {
    const data = await gameService.getUnassigned();
    setUnassignedGames(data);
  };

  async function assignTeam(game, teamId) {
    const team = teams.find((t) => String(t.id) === teamId);
    if (!team) return;

    await gameService.update({ ...game, teamId: team.id });
    await loadUnassigned();
    await filterGames(selectedTeam?.id ?? null);
  }

  function teamLabel(id) {
    const team = teams.find((t) => t.id === id);
    return team ? `${team.club} ${team.name}` : "an unknown team";
  }

  const filterGames = async (teamId) => {
    const [scheduled, played] = await Promise.all([
      gameService.getScheduled(teamId),
      gameService.getPlayed(teamId),
    ]);
    setUpcomingGames(scheduled);
    setPlayedGames(played);
  };

  function selectGame(game) {
    setSelectedGame(game);
    setShowResultPopup(true);
  }

  async function selectTeam(team) {
    if (team === selectedTeam) {
      setSelectedTeam(null);
      await filterGames(null);
      return;
    }

    setSelectedTeam(team);
    await filterGames(team.id);
  }

  useEffect(() => {
    async function loadTeamsAndGames() {
      try {
        const data = await teamService.getAll();
        setTeams(data);
      } catch (err) {
        console.error("Failed to load teams:", err);
      }

      try {
        await filterGames(null);
      } catch (err) {
        console.error("Failed to load games:", err);
      }
    }

    loadTeamsAndGames();
    loadUnassigned();
  }, []);

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex justify-between items-center h-20 flex-shrink-0">
        <h1 className="text-lg font-semibold mb-4 p-4">Games</h1>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md m-5 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={teams.length === 0}
          title={
            teams.length === 0
              ? "Add a team on the Teams page before creating a game."
              : undefined
          }
          onClick={() => {
            setCreateMessage("");
            setShowAddGamePopup(true);
          }}
        >
          <IconPlus />
        </button>
        {teams.length === 0 && (
          <p className="text-sm text-red-500 pr-4">
            No teams yet. Add one on the Teams page first.
          </p>
        )}
        {showAddGamePopup && (
          <GameSavePopup
            teamId={selectedTeam?.id}
            onClose={() => {
              setShowAddGamePopup(false);
              filterGames(selectedTeam?.id ?? null);
            }}
            onSubmit={async (game) => {
              const created = await gameService.create(game);
              await filterGames(selectedTeam?.id ?? null);
              if (selectedTeam && created.teamId !== selectedTeam.id) {
                setCreateMessage(
                  `Game created for ${teamLabel(created.teamId)} — it won't show under the "${teamLabel(selectedTeam.id)}" filter.`
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
      {unassignedGames.length > 0 && (
        <div className="px-4 pb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-2">Unassigned</h2>
          <ul>
            {unassignedGames.map((game) => (
              <li
                key={game.id}
                className="flex items-center justify-between gap-2 p-2 border rounded mb-2"
              >
                <span>{game.opponent}</span>
                <select
                  className="border px-2 py-1 rounded"
                  value=""
                  onChange={(e) => assignTeam(game, e.target.value)}
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
          <h2 className="text-lg font-semibold">Upcoming</h2>
          <div className="flex-1 flex flex-col rounded border overflow-y-auto min-h-0">
            {upcomingGames.length === 0 ? (
              <p className="p-3">No upcoming games.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {upcomingGames.map((game) => (
                  <GameRow key={game.id} game={game} onSelect={selectGame} />
                ))}
              </ul>
            )}
          </div>

          <h2 className="text-lg font-semibold">Played</h2>
          <div className="flex-1 flex flex-col rounded border overflow-y-auto min-h-0">
            {playedGames.length === 0 ? (
              <p className="p-3">No played games.</p>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {playedGames.map((game) => (
                  <GameRow key={game.id} game={game} onSelect={selectGame} />
                ))}
              </ul>
            )}
          </div>
          {showResultPopup && (
            <GameResultPopup
              game={selectedGame}
              onClose={() => setShowResultPopup(false)}
              onSubmit={async ({ us, them }) => {
                await gameService.recordResult(selectedGame.id, { us, them });
                await filterGames(selectedTeam?.id ?? null);
              }}
              onClear={async () => {
                await gameService.clearResult(selectedGame.id);
                await filterGames(selectedTeam?.id ?? null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
