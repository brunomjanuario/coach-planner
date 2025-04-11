import { useState } from "react";
import { teams } from "../model/mock";

export default function Teams() {
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <div class="w-full flex">
      <div class="flex-1 p-4 border text-center">Child 1</div>
      <div class="flex-1 p-4 border text-center">Child 2</div>
      <div class="flex-1 p-4 border text-center">Child 3</div>
    </div>
  );
}
