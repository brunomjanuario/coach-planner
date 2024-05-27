import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-add-button',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, MatButtonModule, CommonModule],
  templateUrl: './add-button.component.html',
  styleUrl: './add-button.component.scss'
})
export class AddButtonComponent {

  @Output() event = new EventEmitter<void>();

  open() {

    this.event.emit();
  }
}
