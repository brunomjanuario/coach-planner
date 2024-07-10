import { Positions, Team } from "./teams";
import { Training } from "./training";

export var teams: Team[] = [
    {
        id: 1,
        name: "Sub-11",
        club: "Amadora",
        season: "23/24",
        players: [
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 1,
                goals: 3,
                assists: 1,
                concededGoals: 0,
                position: Positions.CAM,
            },
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 2,
                goals: 3,
                assists: 1,
                concededGoals: 0,
                position: Positions.CAM,
            },
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 3,
                goals: 3,
                assists: 1,
                concededGoals: 0, 
                position: Positions.CAM,
            },
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 4,
                goals: 3,
                assists: 1,
                concededGoals: 0, 
                position: Positions.CAM,
            },
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 5,
                goals: 3,
                assists: 1,
                concededGoals: 0, 
                position: Positions.CAM,
            },
        ],
    },
    {
        id: 2,
        name: "Sub-19",
        club: "Areias",
        season: "23/24",
        players: [
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 3,
                goals: 3,
                assists: 1,
                concededGoals: 0, 
                position: Positions.CAM,
            },
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 3,
                goals: 3,
                assists: 1,
                concededGoals: 0, 
                position: Positions.CAM,
            },
            {
                id: 1,
                name: "João",
                age: 15,
                shirtNumber: 3,
                goals: 3,
                assists: 1,
                concededGoals: 0,
                position: Positions.CAM,
            },
        ],
    }
]

export var trainings: Training[] = [
    {
        id: 1,
        teamId: 1,
        day: new Date(),
        duration: 90,
        exercises: [
            {
                id: 1,
                trainingId: 1,
                numberOfPlayers: 21,
                duration: 10,
                repetitions: 1,
                description: "Corrida",
                image: ""
            },
            {
                id: 2,
                trainingId: 1,
                numberOfPlayers: 21,
                duration: 20,
                repetitions: 2,
                description: "SSG",
                image: ""
            },
            {
                id: 3,
                trainingId: 1,
                numberOfPlayers: 21,
                duration: 10,
                repetitions: 3,
                description: "Jogo",
                image: ""
            },
        ],
    },
]