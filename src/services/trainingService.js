const API_URL = "/api/teams";
import { trainings } from "../model/mock";

let trainingsData = trainings;

export const trainingService = {
  getAll: async () => {
    return trainingsData;
  },

  getById: async (id) => {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error("Failed to fetch team");
    return res.json();
  },

  create: async (teamData) => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(teamData),
    });
    if (!res.ok) throw new Error("Failed to create team");
    return res.json();
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
};
