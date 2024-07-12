import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingInfoComponent } from './training-info.component';

describe('TrainingInfoComponent', () => {
  let component: TrainingInfoComponent;
  let fixture: ComponentFixture<TrainingInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingInfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TrainingInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
