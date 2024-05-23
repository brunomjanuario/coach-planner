import { Component, OnDestroy, OnInit } from '@angular/core';
import { TeamService } from '../service/team-service';
import { Team } from '../model/teams';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './teams.component.html',
  styleUrl: './teams.component.scss'
})
export class TeamsComponent implements OnInit, OnDestroy {

  public teams?: Team[];

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
}
