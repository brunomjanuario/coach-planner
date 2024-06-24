import { Component, OnDestroy, OnInit } from '@angular/core';
import { TeamService } from '../service/team-service';
import { Player, Team } from '../model/teams';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { PlayersComponent } from './players/players.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TeamUpdateComponent } from './team-update/team-update.component';
import { AddButtonComponent } from '../shared/add-button/add-button.component';
import { TeamInfoComponent } from './team-info/team-info.component';
import { PlayerInfoComponent } from './players/player-info/player-info.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    PlayersComponent, 
    MatDialogModule, 
    TeamUpdateComponent,
    AddButtonComponent, 
    TeamInfoComponent,
    PlayerInfoComponent
  ],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss'
})
export class TeamsComponent implements OnInit, OnDestroy {

  public teams?: Team[];
  public selectedTeam?: Team;
  public selectedPlayer?: Player;

  private teamsSubscription?: Subscription;

  constructor(private teamService: TeamService, private dialog: MatDialog) {

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
    this.selectedPlayer = undefined;
  }

  selectPlayer(player: Player) {
    this.selectedPlayer = player;
  }

  addTeam() {

    const dialogRef = this.dialog.open(TeamUpdateComponent);

    dialogRef.afterClosed().subscribe( result => {

      if (result) {

        const team: Team = {
          id: Math.floor(Math.random() * 1000),
          name: result['name'],
          club: result['club'],
          season: result['season'],
          players: []
        }

        this.teamService.addTeam(team);
      }
    })
  }
}
