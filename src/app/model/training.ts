export interface Training {
    id: number;
    teamId: number;
    day: Date;
    duration: number;
    exercises: Excercise[];
}

export interface Excercise {
    id: number;
    trainingId: number;
    image: string;
    numberOfPlayers: number;
    duration: number;
    repetitions: number;
    description: string;
}