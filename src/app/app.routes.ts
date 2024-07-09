import { Routes } from '@angular/router';
import { TeamsComponent } from './teams/teams.component';
import { TrainingComponent } from './training/training.component';

export const routes: Routes = [
    { path: 'teams', component: TeamsComponent },
    { path: 'training', component: TrainingComponent }
];
