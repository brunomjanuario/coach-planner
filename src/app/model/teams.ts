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
    goals: number;
    assists: number;
    concededGoals: number;
    position: Positions;
}

export enum Positions {
    GK = 'GK',
    RB = 'RB',
    CB = 'CB',
    LB = 'LB',
    RWB = 'RWB',
    LWB = 'LWB',
    CDM = 'CDM',
    RM = 'RM',
    CM = 'CM',
    LM = 'LM',
    CAM = 'CAM',
    RW = 'RW',
    LW = 'LW',
    ST = 'ST',
    CF = 'CF',
    RF = 'RF',
    LF = 'LF'
}