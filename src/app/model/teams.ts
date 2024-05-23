export interface Team {
    id: number;
    name: string;
    club: string;
    season: string;
    players: Player[];
}

export interface Player {
    id: number;
    name: string;
    age: number;
    shirtNumber: number;
}