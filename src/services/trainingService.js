import { getCollection, setCollection } from "./store";
import { newId } from "../lib/id";
import { NotFoundError } from "../lib/errors";

function getTrainings() {
  return getCollection("trainings");
}

function saveTrainings(trainings) {
  setCollection("trainings", trainings);
}

export const trainingService = {
  getAll: async () => {
    return getTrainings();
  },

  getById: async (id) => {
    const trainings = getTrainings();
    return trainings.find((training) => training.id === id) ?? null;
  },

  create: async (trainingData) => {
    const trainings = getTrainings();
    const newTraining = { ...trainingData, id: newId() };
    trainings.push(newTraining);
    saveTrainings(trainings);
    return newTraining;
  },

  update: async (trainingData) => {
    const trainings = getTrainings();
    const index = trainings.findIndex(
      (training) => training.id === trainingData.id
    );
    if (index === -1) {
      throw new NotFoundError(`Training not found: ${trainingData.id}`);
    }
    trainings[index] = { ...trainings[index], ...trainingData };
    saveTrainings(trainings);
    return trainings[index];
  },

  delete: async (id) => {
    const trainings = getTrainings().filter((training) => training.id !== id);
    saveTrainings(trainings);
  },
};
