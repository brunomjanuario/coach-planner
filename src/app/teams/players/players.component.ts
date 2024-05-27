import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {MatTableModule} from '@angular/material/table';
import { Player } from '../../model/teams';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatTableModule],
  templateUrl: './players.component.html',
  styleUrl: './players.component.scss'
})
export class PlayersComponent implements OnChanges {

  @Input() players!: Player[];
  @Output() event = new EventEmitter<Player>();
  displayedColumns: string[] = ['number', 'position','name', 'goals', 'assists', 'concededGoals'];
  selectedPlayer?: Player;

  selectPlayer(player?: Player) {
    this.event.emit(player)
    this.selectedPlayer = player;
  }

  ngOnChanges(changes: SimpleChanges): void {
    
    this.selectPlayer(undefined)
  }
}
