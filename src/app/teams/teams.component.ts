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
import { TeamsListComponent } from "./teams-list/teams-list.component";

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    PlayersComponent,
    TeamUpdateComponent,
    TeamInfoComponent,
    PlayerInfoComponent,
    TeamsListComponent
],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss'
})
export class TeamsComponent {

  public selectedTeam?: Team;
  public selectedPlayer?: Player;

  selectTeam(team: Team) {
    this.selectedTeam = team;
    this.selectedPlayer = undefined;
  }

  selectPlayer(player: Player) {
    this.selectedPlayer = player;
  }
}
