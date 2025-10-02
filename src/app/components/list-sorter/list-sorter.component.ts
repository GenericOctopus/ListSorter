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

import { DatabaseService, SortedList, TierGroup } from '../../services/database.service';
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
  protected tieredItems = signal<TierGroup[]>([]);
  protected showResults = signal(false);
  
  // Lists
  protected lists = signal<SortedList[]>([]);
  protected currentListId = signal<string | undefined>(undefined);
  
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
    
    this.loadLists();
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
      
      // Calculate tiers
      const tiers = this.calculateTiers(sorted);
      this.tieredItems.set(tiers);
      
      this.showResults.set(true);
      
      // Save to database (update existing or create new)
      const list: SortedList = {
        _id: this.currentListId(),
        listName: this.listName(),
        items: this.items(),
        sortedItems: sorted,
        tieredItems: tiers,
        completed: true,
        createdAt: new Date(),
        completedAt: new Date()
      };
      
      // If updating an existing list, get the _rev
      if (this.currentListId()) {
        const existing = await this.databaseService.getSortedList(this.currentListId()!);
        if (existing && existing._rev) {
          list._rev = existing._rev;
          list.createdAt = existing.createdAt; // Keep original creation date
        }
      }
      
      await this.databaseService.saveSortedList(list);
      this.currentListId.set(list._id); // Store the list ID
      await this.loadLists();
      
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
    this.tieredItems.set([]);
    this.showResults.set(false);
    this.currentListId.set(undefined);
  }

  async loadList(list: SortedList): Promise<void> {
    this.listName.set(list.listName);
    this.items.set([...list.items]);
    this.currentListId.set(list._id);
    
    if (list.sortedItems) {
      this.sortedItems.set([...list.sortedItems]);
      
      // Load or recalculate tiers
      if (list.tieredItems) {
        this.tieredItems.set([...list.tieredItems]);
      } else {
        this.tieredItems.set(this.calculateTiers(list.sortedItems));
      }
      
      this.showResults.set(true);
    } else {
      this.sortedItems.set([]);
      this.tieredItems.set([]);
      this.showResults.set(false);
    }
    
    this.snackBar.open('List loaded - you can add more items and re-sort', 'Close', { duration: 3000 });
  }

  async deleteList(list: SortedList): Promise<void> {
    if (list._id) {
      await this.databaseService.deleteList(list._id);
      await this.loadLists();
      this.snackBar.open('List deleted', 'Close', { duration: 2000 });
    }
  }

  private async loadLists(): Promise<void> {
    const lists = await this.databaseService.getAllLists();
    this.lists.set(lists.sort((a: SortedList, b: SortedList) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addItem();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.parseFileContent(content, file.name);
      // Reset the input so the same file can be selected again
      input.value = '';
    };

    reader.onerror = () => {
      this.snackBar.open('Error reading file', 'Close', { duration: 3000 });
    };

    reader.readAsText(file);
  }

  private parseFileContent(content: string, filename: string): void {
    const isCsv = filename.toLowerCase().endsWith('.csv');
    let newItems: string[] = [];

    if (isCsv) {
      // Parse CSV - handle both comma and semicolon separators
      const lines = content.split(/\r?\n/);
      
      for (const line of lines) {
        // Try comma first, then semicolon
        const items = line.includes(',') 
          ? line.split(',') 
          : line.split(';');
        
        newItems.push(...items.map(item => item.trim()).filter(item => item.length > 0));
      }
    } else {
      // Parse TXT - one item per line
      newItems = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }

    // Add unique items to the list
    const currentItems = this.items();
    const uniqueNewItems = newItems.filter(item => !currentItems.includes(item));
    
    if (uniqueNewItems.length > 0) {
      this.items.update(items => [...items, ...uniqueNewItems]);
      this.snackBar.open(
        `Added ${uniqueNewItems.length} item${uniqueNewItems.length !== 1 ? 's' : ''} from file`,
        'Close',
        { duration: 3000 }
      );
    } else {
      this.snackBar.open('No new items found in file', 'Close', { duration: 3000 });
    }
  }

  private calculateTiers(sortedItems: string[]): TierGroup[] {
    if (sortedItems.length === 0) return [];
    
    const tierNames = ['S', 'A', 'B', 'C', 'D', 'F'];
    const itemCount = sortedItems.length;
    
    // Calculate tier sizes based on item count
    // S tier: top ~10%, A: next ~20%, B: next ~30%, C: next ~25%, D: next ~10%, F: bottom ~5%
    const tierPercentages = [0.10, 0.20, 0.30, 0.25, 0.10, 0.05];
    
    const tiers: TierGroup[] = [];
    let currentIndex = 0;
    
    for (let i = 0; i < tierNames.length && currentIndex < itemCount; i++) {
      const tierSize = Math.max(1, Math.round(itemCount * tierPercentages[i]));
      const endIndex = Math.min(currentIndex + tierSize, itemCount);
      
      if (currentIndex < itemCount) {
        tiers.push({
          tier: tierNames[i],
          items: sortedItems.slice(currentIndex, endIndex)
        });
        currentIndex = endIndex;
      }
    }
    
    // If there are remaining items (due to rounding), add them to the last tier
    if (currentIndex < itemCount) {
      const lastTier = tiers[tiers.length - 1];
      if (lastTier) {
        lastTier.items.push(...sortedItems.slice(currentIndex));
      }
    }
    
    return tiers;
  }
}
