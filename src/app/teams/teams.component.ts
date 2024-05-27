import { Component, OnDestroy, OnInit } from '@angular/core';
import { TeamService } from '../service/team-service';
import { Player, Team } from '../model/teams';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import { PlayersComponent } from './players/players.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TeamUpdateComponent } from './team-update/team-update.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddButtonComponent } from '../shared/add-button/add-button.component';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, MatCardModule, PlayersComponent, MatDialogModule, TeamUpdateComponent, AddButtonComponent],
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
  }

  addTeam() {

    const dialogRef = this.dialog.open(TeamUpdateComponent);

    dialogRef.afterClosed().subscribe( result => {

      if (result) {

        console.log(result)

        const team: Team = {
          id: 1,
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
