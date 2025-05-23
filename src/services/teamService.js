const API_URL = "/api/teams";
import { teams } from "../model/mock";

let teamsData = teams;

export const teamService = {
  getAll: async () => {
    return teamsData;
  },

  getById: async (id) => {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch team");
    return res.json();
  },

  create: async (teamData) => {
    teamsData.push(teamData);
  },

  update: async (id, teamData) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(teamData),
    });
    if (!res.ok) throw new Error("Failed to update team");
    return res.json();
  },

  delete: async (id) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete team");
    return true;
  },

  addPlayer: async (teamId, playerData) => {
    const team = teamsData.find((team) => team.id === teamId);
    console.log(teamId);
    team.players.push(playerData);
  },
};
