import { useState, useEffect, useCallback } from "react";
import { IconX } from "@tabler/icons-react";
import { teamService } from "../services/teamService";
import { cardService } from "../services/cardService";

export default function GameCardsSection({ game }) {
  const [team, setTeam] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshCards = useCallback(async () => {
    const data = await cardService.getByGame(game.id);
    setCards(data);
  }, [game.id]);

  useEffect(() => {
    async function load() {
      try {
        const teams = await teamService.getAll();
        setTeam(teams.find((t) => t.id === game.teamId) ?? null);
      } catch (err) {
        console.error("Failed to load team:", err);
      }
      try {
        await refreshCards();
      } catch (err) {
        console.error("Failed to load cards:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [game.teamId, refreshCards]);

  async function addCard(playerId, type) {
    await cardService.record({ playerId, gameId: game.id, type });
    await refreshCards();
  }

  async function removeCard(cardId) {
    await cardService.remove(cardId);
    await refreshCards();
  }

  if (loading) return null;

  if (!team || team.players.length === 0) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-medium mb-2">Cards</h3>
        <p className="text-sm text-gray-500">No players to book.</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Cards</h3>
      <ul className="space-y-2 max-h-40 overflow-y-auto">
        {team.players.map((player) => {
          const playerCards = cards.filter((c) => c.playerId === player.id);
          return (
            <li
              key={player.id}
              className="flex items-center justify-between gap-2 bg-gray-100 rounded px-2 py-1"
            >
              <span className="break-words">
                #{player.shirtNumber} {player.name}
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                {playerCards.map((card) => (
                  <span
                    key={card.id}
                    className={`flex items-center gap-1 px-1 rounded text-white ${
                      card.type === "yellow" ? "bg-yellow-500" : "bg-red-600"
                    }`}
                  >
                    {card.type === "yellow" ? "Y" : "R"}
                    <button
                      type="button"
                      aria-label={`Remove ${card.type} card from #${player.shirtNumber} ${player.name}`}
                      onClick={() => removeCard(card.id)}
                    >
                      <IconX size={12} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  aria-label={`Add yellow card to #${player.shirtNumber} ${player.name}`}
                  className="px-2 py-1 bg-yellow-500 text-white rounded text-xs"
                  onClick={() => addCard(player.id, "yellow")}
                >
                  Yellow
                </button>
                <button
                  type="button"
                  aria-label={`Add red card to #${player.shirtNumber} ${player.name}`}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                  onClick={() => addCard(player.id, "red")}
                >
                  Red
                </button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
