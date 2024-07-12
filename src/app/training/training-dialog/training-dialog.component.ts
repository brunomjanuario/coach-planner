import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { TrainingInfoComponent } from "./training-info/training-info.component";
import { Training } from '../../model/training';
import { TrainingUpdateComponent } from "./training-update/training-update.component";

@Component({
  selector: 'app-training-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, TrainingInfoComponent, TrainingUpdateComponent],
  templateUrl: './training-dialog.component.html',
  styleUrl: './training-dialog.component.scss'
})
export class TrainingDialogComponent {

  @Input() training?: Training;
  @Input() editMode?: boolean;
}
