import { IconEdit, IconTrash } from "@tabler/icons-react";
import { teamService } from "../services/teamService";
import { useState } from "react";
import ConfirmationPopup from "./ConfirmationPopup";
import TeamPopup from "./TeamPopup";

export default function TeamCard({ team, onClose }) {
  const [toDeleteTeam, setToDeleteTeam] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);

  const deleteTeam = () => {
    setToDeleteTeam(false);
    teamService.delete(team.id);
    onClose();
  };

  return (
    <div className="bg-lightblack rounded-2xl shadow-lg p-4 w-full max-w-sm hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-4 justify-between">
        <img
          src="src/assets/images/logo.png"
          className="w-16 h-16 rounded-full object-cover bg-white"
        />
        <div>
          <h2 className="text-lg font-semibold">
            {team.club} {team.name}
          </h2>
        </div>
        <div className="flex">
          <div
            className="m-1 cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setShowEditTeam(true)}
          >
            <IconEdit />
          </div>
          <div
            className="m-1 cursor-pointer rounded hover:bg-lightgrey"
            onClick={() => setToDeleteTeam(true)}
          >
            <IconTrash />
          </div>
          {showEditTeam && (
            <TeamPopup team={team} onClose={() => setShowEditTeam(false)} />
          )}
          {toDeleteTeam && (
            <ConfirmationPopup
              message={"Do you want to delete this team?"}
              onSubmit={() => deleteTeam()}
              onClose={() => setToDeleteTeam(false)}
            />
          )}
        </div>
      </div>
      <div>
        <p>{team.season}</p>
      </div>
    </div>
  );
}
