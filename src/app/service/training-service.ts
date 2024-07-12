import { Injectable } from "@angular/core";
import { Training } from "../model/training";
import { BehaviorSubject, filter, map, Observable } from "rxjs";
import { trainings } from "../model/mock";

@Injectable({providedIn: 'root'})
export class TrainingService {

    private trainigsData: BehaviorSubject<Training[]> = new BehaviorSubject<Training[]>(trainings); 

    getAll(): Observable<Training[]> {

        return this.trainigsData.asObservable();
    }
}