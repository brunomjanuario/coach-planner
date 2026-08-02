import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import PlayerPopup from "../components/PlayerPopup";
import ConfirmationPopup from "./ConfirmationPopup";
import { teamService } from "../services/teamService";
import { cardService } from "../services/cardService";
import { gameService } from "../services/gameService";
import { trainingService } from "../services/trainingService";
import { ratingService } from "../services/ratingService";
import { cardTotals, suspensionStatus, SUSPENSION_THRESHOLD } from "../lib/playerCards";
import { average, form } from "../lib/playerRatings";

export default function PlayerCard({ player, onClose, onUpdated }) {
  const [showEditPlayerPopup, setShowEditPlayerPopup] = useState(false);
  const [toDeletePlayer, setToDeletePlayer] = useState(false);
  const [cardCounts, setCardCounts] = useState({ yellow: 0, red: 0 });
  const [ratingStats, setRatingStats] = useState({
    average: null,
    form: null,
    formCount: 0,
  });

  useEffect(() => {
    async function loadCards() {
      try {
        const [cards, games] = await Promise.all([
          cardService.getByPlayer(player.id),
          gameService.getAll(player.teamId),
        ]);
        const teamGameIds = new Set(games.map((game) => game.id));
        setCardCounts(cardTotals(cards, player.id, teamGameIds));
      } catch (err) {
        console.error("Failed to load cards:", err);
      }
    }

    loadCards();
  }, [player.id, player.teamId]);

  useEffect(() => {
    async function loadRatings() {
      try {
        const [ratings, trainings, games] = await Promise.all([
          ratingService.getByPlayer(player.id),
          trainingService.getAll(),
          gameService.getAll(player.teamId),
        ]);
        const events = [
          ...trainings.map((training) => ({
            id: training.id,
            type: "training",
            date: training.day,
          })),
          ...games.map((game) => ({ id: game.id, type: "game", date: game.date })),
        ];
        const recentForm = form(ratings, events);
        setRatingStats({
          average: average(ratings),
          form: recentForm.value,
          formCount: recentForm.count,
        });
      } catch (err) {
        console.error("Failed to load ratings:", err);
      }
    }

    loadRatings();
  }, [player.id, player.teamId]);

  const status = suspensionStatus(cardCounts);

  const deletePlayer = () => {
    teamService.deletePlayer(player);
    setToDeletePlayer(false);
    onClose();
  };

  return (
    <div className="bg-lightblack rounded-2xl shadow-lg p-4 w-full max-w-sm hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-4 justify-between">
        <img
          src="src/assets/images/person.png"
          className="w-16 h-16 rounded-full object-cover bg-white"
        />
        <div>
          <h2 className="text-lg font-semibold">
            {player.shirtNumber} {player.name}
          </h2>
        </div>
        <div className="flex">
          <div
            className="m-1 cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setShowEditPlayerPopup(true)}
          >
            <IconEdit />
          </div>
          <div
            className="m-1 cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setToDeletePlayer(true)}
          >
            <IconTrash />
          </div>
        </div>
        {showEditPlayerPopup && (
          <PlayerPopup
            player={player}
            teamId={player?.teamId}
            onClose={() => {
              setShowEditPlayerPopup(false);
              onUpdated();
            }}
          />
        )}
        {toDeletePlayer && (
          <ConfirmationPopup
            message={"Do you want to delete the player?"}
            onSubmit={() => deletePlayer()}
            onClose={() => setToDeletePlayer(false)}
          />
        )}
      </div>
      <div className="mb-3">
        <h3>Age</h3>
        <p>{player.age}</p>
      </div>
      <div className="mb-3">
        <h3>Position</h3>
        <p>{player.position}</p>
      </div>
      <div className="mb-3">
        <h3>Goals</h3>
        <p>{player.goals}</p>
      </div>
      <div className="mb-3">
        <h3>Conceded Goals</h3>
        <p>{player.concededGoals}</p>
      </div>
      <div className="mb-3">
        <h3>Yellow Cards</h3>
        <p>{cardCounts.yellow}</p>
      </div>
      <div className="mb-3">
        <h3>Red Cards</h3>
        <p>{cardCounts.red}</p>
      </div>
      <div className="mb-3">
        <h3>Average Rating</h3>
        <p>{ratingStats.average != null ? ratingStats.average.toFixed(1) : "—"}</p>
      </div>
      <div className="mb-3">
        <h3>Form</h3>
        <p>
          {ratingStats.form != null
            ? `${ratingStats.form.toFixed(1)} (${ratingStats.formCount})`
            : "—"}
        </p>
      </div>
      {status === "approaching" && (
        <p role="alert" className="mb-3 text-sm font-semibold text-amber-500">
          Approaching suspension — {SUSPENSION_THRESHOLD - cardCounts.yellow}{" "}
          yellow card away from a ban
        </p>
      )}
      {status === "suspended" && (
        <p role="alert" className="mb-3 text-sm font-semibold text-red-600">
          Suspended — expect a 1-game ban
        </p>
      )}
    </div>
  );
}
