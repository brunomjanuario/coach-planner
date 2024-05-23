import { Injectable } from "@angular/core";
import { Team } from "../model/teams";
import { teams } from "../model/mock";
import { Observable, of } from "rxjs";

@Injectable({providedIn: 'root'})
export class TeamService {

    getAll(): Observable<Team[]> {
        return of(teams);
    }

}