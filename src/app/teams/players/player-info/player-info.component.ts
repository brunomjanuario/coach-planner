import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Player } from '../../../model/teams';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';

@Component({
  selector: 'app-player-info',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './player-info.component.html',
  styleUrl: './player-info.component.scss'
})
export class PlayerInfoComponent {

  @Input() player?: Player;
}
