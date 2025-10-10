import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SortedList } from '../../../services/database.service';

@Component({
  selector: 'app-saved-lists-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './saved-lists-sidebar.component.html',
  styleUrl: './saved-lists-sidebar.component.scss'
})
export class SavedListsSidebarComponent {
  // Inputs
  lists = input.required<SortedList[]>();
  isDisabled = input<boolean>(false);

  // Outputs
  loadList = output<SortedList>();
  deleteList = output<SortedList>();

  onLoadList(list: SortedList): void {
    this.loadList.emit(list);
  }

  onDeleteList(list: SortedList): void {
    this.deleteList.emit(list);
  }
}
