import { IconEdit } from "@tabler/icons-react";

export default function TeamCard({ team }) {
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
        <div className="cursor-pointer rounded hover:bg-lightgrey">
          <IconEdit />
        </div>
      </div>
      <div>
        <p>{team.season}</p>
      </div>
    </div>
  );
}
