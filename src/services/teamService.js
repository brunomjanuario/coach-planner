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

  update: async (teamData) => {
    const team = teamsData.find((team) => team.id === teamData.id);
    team.name = teamData.name;
    team.club = teamData.club;
    team.season = teamData.season;
  },

  delete: async (id) => {
    teamsData = teamsData.filter((team) => team.id !== id);
  },

  addPlayer: async (teamId, playerData) => {
    const team = teamsData.find((team) => team.id === teamId);
    team.players.push(playerData);
  },

  updatePlayer: async (playerData) => {
    const team = teamsData.find((team) => team.id === playerData.teamId);
    const player = team.players.find((player) => player.id === playerData.id);
    player.age = playerData.age;
    player.name = playerData.name;
    player.shirtNumber = playerData.shirtNumber;
    player.position = playerData.position;
  },

  deletePlayer: async (playerData) => {
    const team = teamsData.find((team) => team.id === playerData.teamId);
    const newList = team.players.filter(
      (player) => player.id !== playerData.id
    );
    team.players = newList;
  },
};
