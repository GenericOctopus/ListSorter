import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListSorterComponent } from './components/list-sorter/list-sorter.component';
import { PwaService } from './services/pwa.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ListSorterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ListSorter');
  private pwaService = inject(PwaService);

  constructor() {
    // PWA service is initialized automatically via injection
    console.log('App initialized with PWA support');
  }
}
