import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import { DatabaseService, SortedList, TierGroup } from '../../services/database.service';
import { MergeSortService, SortState } from '../../services/merge-sort.service';
import { ListInputComponent } from './list-input/list-input.component';
import { SortingComparisonComponent } from './sorting-comparison/sorting-comparison.component';
import { TierResultsComponent } from './tier-results/tier-results.component';
import { SavedListsSidebarComponent } from './saved-lists-sidebar/saved-lists-sidebar.component';

@Component({
  selector: 'app-list-sorter',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    ListInputComponent,
    SortingComparisonComponent,
    TierResultsComponent,
    SavedListsSidebarComponent
  ],
  templateUrl: './list-sorter.component.html',
  styleUrl: './list-sorter.component.scss'
})
export class ListSorterComponent {
  // Input state
  protected listName = signal('');
  protected currentItem = signal('');
  protected pastedText = signal('');
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
  protected showAdvancedSettings = signal(false);
  
  // Tier percentages (default values)
  protected tierPercentages = signal<number[]>([10, 20, 30, 25, 10, 5]);
  protected tierNames = ['S', 'A', 'B', 'C', 'D', 'F'];
  
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

  onFileSelected(file: File): void {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.parseFileContent(content, file.name);
    };

    reader.onerror = () => {
      this.snackBar.open('Error reading file', 'Close', { duration: 3000 });
    };

    reader.readAsText(file);
  }

  addPastedItems(): void {
    const content = this.pastedText().trim();
    if (!content) {
      return;
    }

    const newItems = this.parseTextContent(content);
    const currentItems = this.items();
    const uniqueNewItems = newItems.filter(item => !currentItems.includes(item));
    
    if (uniqueNewItems.length > 0) {
      this.items.update(items => [...items, ...uniqueNewItems]);
      this.snackBar.open(
        `Added ${uniqueNewItems.length} item${uniqueNewItems.length !== 1 ? 's' : ''} from pasted text`,
        'Close',
        { duration: 3000 }
      );
      this.pastedText.set(''); // Clear the textarea after adding
    } else {
      this.snackBar.open('No new items found in pasted text', 'Close', { duration: 3000 });
    }
  }

  private parseFileContent(content: string, filename: string): void {
    const isCsv = filename.toLowerCase().endsWith('.csv');
    const newItems = isCsv ? this.parseCsvContent(content) : this.parseTextContent(content);

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

  private parseCsvContent(content: string): string[] {
    const newItems: string[] = [];
    const lines = content.split(/\r?\n/);
    
    for (const line of lines) {
      // Try comma first, then semicolon
      const items = line.includes(',') 
        ? line.split(',') 
        : line.split(';');
      
      newItems.push(...items.map(item => item.trim()).filter(item => item.length > 0));
    }
    
    return newItems;
  }

  private parseTextContent(content: string): string[] {
    // First try to split by newlines
    let items = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    
    // If we only got one item, try splitting by commas
    if (items.length === 1 && items[0].includes(',')) {
      items = items[0].split(',').map(item => item.trim()).filter(item => item.length > 0);
    }
    
    return items;
  }

  private calculateTiers(sortedItems: string[]): TierGroup[] {
    if (sortedItems.length === 0) return [];
    
    const itemCount = sortedItems.length;
    const percentages = this.tierPercentages();
    
    const tiers: TierGroup[] = [];
    let currentIndex = 0;
    
    for (let i = 0; i < this.tierNames.length && currentIndex < itemCount; i++) {
      const tierSize = Math.max(1, Math.round(itemCount * percentages[i] / 100));
      const endIndex = Math.min(currentIndex + tierSize, itemCount);
      
      if (currentIndex < itemCount) {
        tiers.push({
          tier: this.tierNames[i],
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
  
  // Drag and drop handler
  onItemDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) {
      // Reorder within the same tier
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Move between tiers
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    
    // Update the tiered items signal
    this.tieredItems.update(tiers => [...tiers]);
    
    // Save the updated list to database
    this.saveCurrentList();
  }
  
  // Update a specific tier percentage
  updateTierPercentage(index: number, value: number): void {
    const percentages = [...this.tierPercentages()];
    percentages[index] = value;
    this.tierPercentages.set(percentages);
  }
  
  // Validate tier percentage input (clamp between 0-100)
  validateTierPercentage(index: number): void {
    const percentages = [...this.tierPercentages()];
    let value = percentages[index];
    
    // Clamp value between 0 and 100
    if (value < 0) {
      value = 0;
    } else if (value > 100) {
      value = 100;
    }
    
    percentages[index] = value;
    this.tierPercentages.set(percentages);
  }
  
  // Recalculate tiers with new percentages
  recalculateTiers(): void {
    const allItems = this.tieredItems().flatMap(tier => tier.items);
    const newTiers = this.calculateTiers(allItems);
    this.tieredItems.set(newTiers);
    this.saveCurrentList();
    this.snackBar.open('Tiers recalculated with new percentages', 'Close', { duration: 3000 });
  }
  
  // Reset tier percentages to defaults
  resetTierPercentages(): void {
    this.tierPercentages.set([10, 20, 30, 25, 10, 5]);
    this.snackBar.open('Tier percentages reset to defaults', 'Close', { duration: 2000 });
  }
  
  // Save current list to database
  private async saveCurrentList(): Promise<void> {
    if (!this.currentListId() || !this.showResults()) {
      return;
    }
    
    try {
      const list: SortedList = {
        _id: this.currentListId(),
        listName: this.listName(),
        items: this.items(),
        sortedItems: this.tieredItems().flatMap(tier => tier.items),
        tieredItems: this.tieredItems(),
        completed: true,
        createdAt: new Date(),
        completedAt: new Date()
      };
      
      const existing = await this.databaseService.getSortedList(this.currentListId()!);
      if (existing && existing._rev) {
        list._rev = existing._rev;
        list.createdAt = existing.createdAt;
      }
      
      await this.databaseService.saveSortedList(list);
      await this.loadLists();
    } catch (error) {
      console.error('Error saving list:', error);
    }
  }
}
