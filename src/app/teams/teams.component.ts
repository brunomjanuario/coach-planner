import { Component, OnDestroy, OnInit } from '@angular/core';
import { TeamService } from '../service/team-service';
import { Player, Team } from '../model/teams';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import { PlayersComponent } from './players/players.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, PlayersComponent],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss'
})
export class TeamsComponent implements OnInit, OnDestroy {

  public teams?: Team[];
  public selectedTeam?: Team;
  public selectedPlayer?: Player;

  private teamsSubscription?: Subscription;

  constructor(private teamService: TeamService) {

  }

  ngOnInit(): void {

    this.teamsSubscription = this.teamService.getAll().subscribe( (teams: Team[]) => {
      this.teams = teams;
    })
  }

  ngOnDestroy(): void {
    
    if (!this.teamsSubscription?.closed) {
      
      this.teamsSubscription?.unsubscribe();
    }
  }

  selectTeam(team: Team) {

    this.selectedTeam = team;
  }
}
