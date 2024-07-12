import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingUpdateComponent } from './training-update.component';

describe('TrainingUpdateComponent', () => {
  let component: TrainingUpdateComponent;
  let fixture: ComponentFixture<TrainingUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingUpdateComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TrainingUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
