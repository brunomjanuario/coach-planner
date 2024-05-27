import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TeamUpdateComponent } from '../../team-update/team-update.component';
import { Positions } from '../../../model/teams';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-player-update',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    ReactiveFormsModule, 
    MatOptionModule, 
    MatSelectModule],
  templateUrl: './player-update.component.html',
  styleUrl: './player-update.component.scss'
})
export class PlayerUpdateComponent {

  form: FormGroup;
  enumOptions = Object.values(Positions);

  constructor(
    public dialogRef: MatDialogRef<TeamUpdateComponent>,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      age: ['', [Validators.required]],
      shirtNumber: ['', [Validators.required]],
      position: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
