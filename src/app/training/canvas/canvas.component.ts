import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [MatButton, CommonModule],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.scss'
})
export class CanvasComponent {
  @ViewChild('myCanvas', { static: false }) myCanvas?: ElementRef<HTMLCanvasElement>;

  private context?: CanvasRenderingContext2D | null;
  private drawing = false;
  isEraserMode = false;

  ngAfterViewInit(): void {
    this.context = this.myCanvas?.nativeElement.getContext('2d');

    if (this.context) {
      this.context.lineWidth = 5; // Set the width of the lines
      this.context.lineCap = 'round'; // Set the cap of the lines to be round
    }

    if (this.myCanvas) {
      // Attach event listeners
      this.myCanvas.nativeElement.addEventListener('mousedown', this.startDrawing.bind(this));
      this.myCanvas.nativeElement.addEventListener('mouseup', this.stopDrawing.bind(this));
      this.myCanvas.nativeElement.addEventListener('mousemove', this.draw.bind(this));
    }
  }

  startDrawing(event: MouseEvent): void {
    this.drawing = true;
    this.context?.beginPath();
    this.context?.moveTo(event.offsetX, event.offsetY);
  }

  stopDrawing(): void {
    this.drawing = false;
    this.context?.closePath();
  }

  draw(event: MouseEvent): void {
    if (!this.drawing) return;

    if (!this.context) return;

    if (this.isEraserMode) {
      this.context.strokeStyle = '#FFFFFF'; // Assuming the canvas background is white
      this.context.lineWidth = 10; // Make the eraser thicker
    } else {
      this.context.strokeStyle = '#000000'; // Set the pen color
      this.context.lineWidth = 5; // Set the pen thickness
    }

    this.context.lineTo(event.offsetX, event.offsetY);
    this.context.stroke();
  }

  toggleMode(): void {
    this.isEraserMode = !this.isEraserMode;
  }

  refresh() {
    this.context?.clearRect(0, 0, 500, 500);
  }
}
