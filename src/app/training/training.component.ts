import { Component } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';
import { TeamsComponent } from "../teams/teams.component";
import { TeamsListComponent } from "../teams/teams-list/teams-list.component";

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CanvasComponent, TeamsListComponent],
  templateUrl: './training.component.html',
  styleUrl: './training.component.scss'
})
export class TrainingComponent {
  
}
