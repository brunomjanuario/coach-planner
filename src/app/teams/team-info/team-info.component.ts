import { Component, Input } from '@angular/core';
import { Team } from '../../model/teams';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-team-info',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './team-info.component.html',
  styleUrl: './team-info.component.scss'
})
export class TeamInfoComponent {

  @Input() team?: Team;

}
