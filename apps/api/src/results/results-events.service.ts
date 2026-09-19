import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { filter } from "rxjs/operators";

/**
 * Interní pub/sub pro živé výsledky (F16, 03-architecture.md §3.6) — jeden
 * proces, jedna instance API. Při škálování na víc instancí by tohle
 * musel nahradit Redis pub/sub (viz architecture doc), pro MVP stačí
 * in-memory Subject.
 */
@Injectable()
export class ResultsEventsService {
  private readonly zmeny$ = new Subject<string>();

  oznamZmenu(trasaId: string): void {
    this.zmeny$.next(trasaId);
  }

  sledovatZmeny(trasaId: string): Observable<string> {
    return this.zmeny$.asObservable().pipe(filter((id) => id === trasaId));
  }
}
