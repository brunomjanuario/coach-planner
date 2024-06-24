import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {MatTable, MatTableModule} from '@angular/material/table';
import { Player, Team } from '../../model/teams';
import { AddButtonComponent } from '../../shared/add-button/add-button.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PlayerUpdateComponent } from './player-update/player-update.component';
import { TeamService } from '../../service/team-service';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatTableModule, AddButtonComponent, MatDialogModule, PlayerUpdateComponent],
  templateUrl: './players.component.html',
  styleUrl: './players.component.scss'
})
export class PlayersComponent implements OnChanges {

  @ViewChild(MatTable) table!: MatTable<Player>;

  @Input() players!: Player[];
  @Input() teamId!: number;
  @Output() event = new EventEmitter<Player>();
  displayedColumns: string[] = ['number', 'position','name', 'goals', 'assists', 'concededGoals'];
  selectedPlayer?: Player;

  constructor(private teamService: TeamService, private dialog: MatDialog) {

  }

  selectPlayer(player?: Player) {
    this.event.emit(player)
    this.selectedPlayer = player;
  }

  ngOnChanges(changes: SimpleChanges): void {
    
    this.selectPlayer(undefined)
  }

  addPlayer() {
    const dialogRef = this.dialog.open(PlayerUpdateComponent);

    dialogRef.afterClosed().subscribe( result => {

      if (result) {

        const player: Player = {
          id: Math.floor(Math.random() * 1000),
          name: result['name'],
          shirtNumber: result['shirtNumber'],
          age: result['age'],
          goals: 0,
          assists: 0,
          concededGoals: 0,
          position: result['position'],
        }

        this.teamService.addPlayer(this.teamId, player);
        this.table.renderRows();
      }
    })
  }
}
