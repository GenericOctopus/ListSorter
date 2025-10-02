import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ListSorterComponent } from './components/list-sorter/list-sorter.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ListSorterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('ListSorter');
}
