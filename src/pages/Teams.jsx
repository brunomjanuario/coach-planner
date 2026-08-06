import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import TeamCard from "../components/TeamCard";
import { teamService } from "../services/teamService";
import { gameService } from "../services/gameService";
import { cardService } from "../services/cardService";
import { cardTotals, suspensionStatus } from "../lib/playerCards";
import { IconShieldPlus, IconUsersPlus } from "@tabler/icons-react";
import TeamPopup from "../components/TeamPopup";
import PlayerPopup from "../components/PlayerPopup";
import PlayerCard from "../components/PlayerCard";
import SelectableListItem from "../components/SelectableListItem";
import SquadRanking from "../components/SquadRanking";

export default function Teams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showPlayerPopup, setShowPlayerPopup] = useState(false);
  const [suspendedPlayerIds, setSuspendedPlayerIds] = useState(new Set());

  useEffect(() => {
    async function loadSuspensions() {
      if (!selectedTeam) {
        setSuspendedPlayerIds(new Set());
        return;
      }

      try {
        const games = await gameService.getAll(selectedTeam.id);
        const teamGameIds = new Set(games.map((game) => game.id));
        const statuses = await Promise.all(
          selectedTeam.players.map(async (player) => {
            const cards = await cardService.getByPlayer(player.id);
            const totals = cardTotals(cards, player.id, teamGameIds);
            return { id: player.id, status: suspensionStatus(totals) };
          })
        );
        setSuspendedPlayerIds(
          new Set(
            statuses
              .filter((entry) => entry.status === "suspended")
              .map((entry) => entry.id)
          )
        );
      } catch (err) {
        console.error("Failed to load suspensions:", err);
      }
    }

    loadSuspensions();
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      const data = await teamService.getAll();
      setTeams(data);
      return data;
    } catch (err) {
      console.error("Failed to load teams:", err);
      return [];
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Resolves the initial ?team= deep link once teams have loaded. Only runs
  // while nothing is selected yet, so it never overrides a later manual
  // selection or reselection after a data refresh (AC DTILE-04.1, DTILE-04.3).
  useEffect(() => {
    if (selectedTeam != null) return;
    const teamParam = searchParams.get("team");
    if (teamParam == null) return;

    const match = teams.find((t) => String(t.id) === teamParam);
    if (match) setSelectedTeam(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  const selectTeam = (team) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("team", team.id);
      return next;
    });
  };

  const closeTeam = () => {
    setSelectedTeam(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("team");
      return next;
    });
    loadTeams();
  };

  const refreshAndResync = async () => {
    const data = await loadTeams();
    setSelectedTeam((prev) =>
      prev ? data.find((t) => t.id === prev.id) ?? null : prev
    );
  };

  const refreshAndResyncPlayer = async () => {
    const data = await loadTeams();
    const nextTeam = selectedTeam
      ? data.find((t) => t.id === selectedTeam.id) ?? null
      : selectedTeam;
    setSelectedTeam(nextTeam);
    setSelectedPlayer((prev) =>
      prev && nextTeam
        ? nextTeam.players.find((p) => p.id === prev.id) ?? null
        : prev
    );
  };

  return (
    <div className="w-full flex">
      <div className="flex-1 p-4 text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex-1 text-center text-xl font-semibold">Teams</h2>
          <div
            className="cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setShowPopup(true)}
          >
            <IconShieldPlus />
          </div>
          {showPopup && (
            <TeamPopup
              onClose={() => {
                setShowPopup(false);
                refreshAndResync();
              }}
            />
          )}
        </div>
        <div>
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
      </div>

      <div className="flex-1 p-4 text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex-1 text-center text-xl font-semibold">Players</h2>
          <button
            type="button"
            className="cursor-pointer rounded hover:bg-lightgrey disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!selectedTeam}
            title={!selectedTeam ? "Select a team before adding a player." : undefined}
            onClick={() => setShowPlayerPopup(true)}
          >
            <IconUsersPlus />
          </button>
          {showPlayerPopup && (
            <PlayerPopup
              player={null}
              teamId={selectedTeam?.id}
              onClose={() => {
                setShowPlayerPopup(false);
                refreshAndResync();
              }}
            />
          )}
        </div>
        <div>
          {selectedTeam === null ? (
            <p>Select a team to see its players.</p>
          ) : selectedTeam.players?.length === 0 ? (
            <p>No players yet.</p>
          ) : (
            <ul>
              {selectedTeam.players.map((player) => (
                <SelectableListItem
                  key={player.id}
                  selected={selectedPlayer?.id === player.id}
                  onSelect={() => setSelectedPlayer(player)}
                >
                  {player.shirtNumber} {player.name}
                  {suspendedPlayerIds.has(player.id) && (
                    <span className="ml-2 text-red-500 font-semibold">
                      Suspended
                    </span>
                  )}
                </SelectableListItem>
              ))}
            </ul>
          )}
        </div>
        {selectedTeam !== null && <SquadRanking team={selectedTeam} />}
      </div>

      <div className="flex-1 p-4 text-center">
        <h2 className="text-lg font-semibold mb-4">Edit</h2>
        {selectedTeam !== null && selectedPlayer === null ? (
          <TeamCard
            team={selectedTeam}
            onClose={() => closeTeam()}
            onUpdated={() => refreshAndResync()}
          />
        ) : (
          ""
        )}
        {selectedPlayer !== null ? (
          <PlayerCard
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            onUpdated={() => refreshAndResyncPlayer()}
            onDeleted={() => refreshAndResync()}
          />
        ) : (
          ""
        )}
      </div>
    </div>
  );
}
