import { IconEdit, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import PlayerPopup from "../components/PlayerPopup";
import ConfirmationPopup from "./ConfirmationPopup";
import { teamService } from "../services/teamService";

export default function PlayerCard({ player, onClose }) {
  const [showEditPlayerPopup, setShowEditPlayerPopup] = useState(false);
  const [toDeletePlayer, setToDeletePlayer] = useState(false);

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
            onClose={() => setShowEditPlayerPopup(false)}
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
    </div>
  );
}
