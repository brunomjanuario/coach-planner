import { Injectable } from "@angular/core";
import { Team } from "../model/teams";
import { teams } from "../model/mock";
import { BehaviorSubject, Observable, of } from "rxjs";

@Injectable({providedIn: 'root'})
export class TeamService {

    private teamsData: BehaviorSubject<Team[]> = new BehaviorSubject<Team[]>(teams); 

    getAll(): Observable<Team[]> {
        return this.teamsData.asObservable();
    }

    addTeam(team: Team): void {
        const currentData = this.teamsData.getValue();
        currentData.push(team);
        this.teamsData.next(currentData);
    }

}