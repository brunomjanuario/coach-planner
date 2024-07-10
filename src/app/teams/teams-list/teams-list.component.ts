import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AddButtonComponent } from '../../shared/add-button/add-button.component';
import { Team } from '../../model/teams';
import { TeamUpdateComponent } from '../team-update/team-update.component';
import { Subscription } from 'rxjs';
import { TeamService } from '../../service/team-service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    AddButtonComponent,
  ],
  templateUrl: './teams-list.component.html',
  styleUrl: './teams-list.component.scss'
})
export class TeamsListComponent implements OnInit, OnDestroy {

  @Output() event = new EventEmitter<Team>();
  public teams?: Team[];
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
    this.event.emit(team)
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
