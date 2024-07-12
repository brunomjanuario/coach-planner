import { Component, OnDestroy, OnInit } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';
import { TeamsListComponent } from "../teams/teams-list/teams-list.component";
import { AddButtonComponent } from "../shared/add-button/add-button.component";
import { TrainingService } from '../service/training-service';
import { Team } from '../model/teams';
import { Training } from '../model/training';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TeamService } from '../service/team-service';
import { MatDialog } from '@angular/material/dialog';
import { TrainingDialogComponent } from './training-dialog/training-dialog.component';

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CanvasComponent, TeamsListComponent, AddButtonComponent, CommonModule, MatCardModule, MatIconModule],
  templateUrl: './training.component.html',
  styleUrl: './training.component.scss'
})
export class TrainingComponent implements OnDestroy, OnInit {

  public teams?: Team[]
  public futureTrainings?: Training[];
  public pastTrainings?: Training[];
  public selectedTeam?: number;

  private trains: Training[] = [];
  private trainsSubscription?: Subscription;
  private teamsSubscription?: Subscription;

  constructor(private trainingService: TrainingService, private teamService: TeamService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.fillTeams();
    this.fillTrainings();
  }
  
  selectTeam(team: Team) {

    if (this.selectedTeam === team.id) {
      
      this.selectedTeam = undefined
    } else {

      this.selectedTeam = team.id
    }

    this.filterTrainings();
  }

  selectAll() {
    this.selectedTeam = undefined
    this.fillTrainings()
  }

  isSelected(team: Team): boolean {
    return this.selectedTeam === team.id
  }

  private fillTrainings() {

    this.trainsSubscription = this.trainingService.getAll().subscribe( (trains: Training[]) => {

      this.trains = trains;
      this.filterTrainings();
    });
  }

  private filterTrainings() {
    let trains = this.trains

    if (this.selectedTeam) {
      trains = trains.filter(train => this.selectedTeam === train.teamId)
    }

    const today = new Date()

    this.futureTrainings = trains.filter(train => train.day.getTime() >= today.getTime());
    this.pastTrainings = trains.filter(train => train.day.getTime() < today.getTime());
  }

  private fillTeams() {

    this.teamsSubscription = this.teamService.getAll().subscribe(teams => {
      this.teams = teams
    })
  }

  addTraining() {

    const dialogRef = this.dialog.open(TrainingDialogComponent);

    dialogRef.afterClosed().subscribe( result => {

      if (result) {
      }
    })
  }

  ngOnDestroy(): void {
    
    this.trainsSubscription?.unsubscribe();
    this.teamsSubscription?.unsubscribe();
  }

  selectTrain(train: Training) {

  }
}
