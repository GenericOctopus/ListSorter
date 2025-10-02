import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { DatabaseService, SortSession } from '../../services/database.service';
import { MergeSortService, SortState } from '../../services/merge-sort.service';

@Component({
  selector: 'app-list-sorter',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatListModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './list-sorter.component.html',
  styleUrl: './list-sorter.component.scss'
})
export class ListSorterComponent {
  // Input state
  protected listName = signal('');
  protected currentItem = signal('');
  protected items = signal<string[]>([]);
  
  // Sort state
  protected sortState = signal<SortState>({
    isActive: false,
    currentPair: null,
    progress: 0,
    totalComparisons: 0,
    completedComparisons: 0
  });
  
  protected sortedItems = signal<string[]>([]);
  protected showResults = signal(false);
  
  // Sessions
  protected sessions = signal<SortSession[]>([]);
  
  // Computed
  protected canAddItem = computed(() => 
    this.currentItem().trim().length > 0 && 
    !this.sortState().isActive
  );
  
  protected canStartSort = computed(() => 
    this.items().length >= 2 && 
    !this.sortState().isActive &&
    this.listName().trim().length > 0
  );

  constructor(
    private databaseService: DatabaseService,
    private mergeSortService: MergeSortService,
    private snackBar: MatSnackBar
  ) {
    this.mergeSortService.sortState$.subscribe(state => {
      this.sortState.set(state);
    });
    
    this.loadSessions();
  }

  addItem(): void {
    const item = this.currentItem().trim();
    if (item && !this.items().includes(item)) {
      this.items.update(items => [...items, item]);
      this.currentItem.set('');
    } else if (this.items().includes(item)) {
      this.snackBar.open('Item already exists in the list', 'Close', { duration: 3000 });
    }
  }

  removeItem(item: string): void {
    this.items.update(items => items.filter(i => i !== item));
  }

  async startSort(): Promise<void> {
    if (!this.canStartSort()) {
      return;
    }

    this.showResults.set(false);
    
    try {
      const sorted = await this.mergeSortService.startSort(this.items());
      this.sortedItems.set(sorted);
      this.showResults.set(true);
      
      // Save to database
      const session: SortSession = {
        listName: this.listName(),
        items: this.items(),
        sortedItems: sorted,
        completed: true,
        createdAt: new Date(),
        completedAt: new Date()
      };
      
      await this.databaseService.saveSortSession(session);
      await this.loadSessions();
      
      this.snackBar.open('Sort completed and saved!', 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Error during sorting', 'Close', { duration: 3000 });
    }
  }

  selectOption(option: 'A' | 'B' | 'Equal'): void {
    const state = this.sortState();
    if (state.currentPair) {
      this.mergeSortService.submitComparison(
        state.currentPair.itemA,
        state.currentPair.itemB,
        option
      );
    }
  }

  cancelSort(): void {
    this.mergeSortService.cancelSort();
    this.showResults.set(false);
  }

  clearList(): void {
    this.items.set([]);
    this.currentItem.set('');
    this.listName.set('');
    this.sortedItems.set([]);
    this.showResults.set(false);
  }

  async loadSession(session: SortSession): Promise<void> {
    this.listName.set(session.listName);
    this.items.set([...session.items]);
    if (session.sortedItems) {
      this.sortedItems.set([...session.sortedItems]);
      this.showResults.set(true);
    }
    this.snackBar.open('Session loaded', 'Close', { duration: 2000 });
  }

  async deleteSession(session: SortSession): Promise<void> {
    if (session._id) {
      await this.databaseService.deleteSession(session._id);
      await this.loadSessions();
      this.snackBar.open('Session deleted', 'Close', { duration: 2000 });
    }
  }

  private async loadSessions(): Promise<void> {
    const sessions = await this.databaseService.getAllSessions();
    this.sessions.set(sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addItem();
    }
  }
}
