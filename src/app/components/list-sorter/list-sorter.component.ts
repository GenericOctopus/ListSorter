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
import { AuthWidgetComponent } from '../auth-widget/auth-widget.component';

@Component({
  selector: 'app-list-sorter',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    ListInputComponent,
    SortingComparisonComponent,
    TierResultsComponent,
    SavedListsSidebarComponent,
    AuthWidgetComponent
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
  
  // Tier percentages (default values)
  protected tierPercentages = signal<number[]>([10, 20, 20, 20, 20, 10]);
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

  editItemInList(event: { oldName: string; newName: string }): void {
    const itemsArray = [...this.items()];
    const index = itemsArray.indexOf(event.oldName);
    if (index !== -1) {
      itemsArray[index] = event.newName;
      this.items.set(itemsArray);
      this.snackBar.open('Item name updated', 'Close', { duration: 2000 });
    }
  }

  async startSort(forceFullSort: boolean = false): Promise<void> {
    if (!this.canStartSort()) {
      return;
    }

    this.showResults.set(false);
    
    try {
      // Check if we have already sorted items to enable incremental sorting
      // Unless forceFullSort is true, then always do a full sort
      const existingSortedItems = !forceFullSort && this.sortedItems().length > 0 ? this.sortedItems() : undefined;
      
      // Pass existing sorted items to enable incremental sorting
      const sorted = await this.mergeSortService.startSort(this.items(), existingSortedItems);
      this.sortedItems.set(sorted);
      
      // Calculate tiers
      const tiers = this.calculateTiers(sorted);
      this.tieredItems.set(tiers);
      
      this.showResults.set(true);
      
      // Save to database (update existing or create new)
      // Generate ID if this is a new list, otherwise use existing ID
      const listId = this.currentListId() || `list_${Date.now()}`;
      
      const list: SortedList = {
        _id: listId,
        listName: this.listName(),
        items: this.items(),
        sortedItems: sorted,
        tieredItems: tiers,
        completed: true,
        createdAt: new Date(),
        completedAt: new Date()
      };
      
      console.log('About to save list:', list);
      
      // If updating an existing list, get the _rev and preserve creation date
      if (this.currentListId()) {
        const existing = await this.databaseService.getSortedList(this.currentListId()!);
        if (existing && existing._rev) {
          list._rev = existing._rev;
          list.createdAt = existing.createdAt; // Keep original creation date
        }
      }
      
      await this.databaseService.saveSortedList(list);
      console.log('List saved, reloading lists...');
      this.currentListId.set(listId); // Store the list ID
      await this.loadLists();
      
      const wasIncremental = existingSortedItems && existingSortedItems.length > 0;
      const message = forceFullSort
        ? 'Entire list resorted from scratch!'
        : wasIncremental 
          ? 'New items sorted and added to list!' 
          : 'Sort completed and saved!';
      this.snackBar.open(message, 'Close', { duration: 3000 });
    } catch (error: any) {
      console.error('Error during sorting/saving:', error);
      console.error('Error details:', error?.message, error?.stack);
      this.snackBar.open(`Error during sorting: ${error?.message || 'Unknown error'}`, 'Close', { duration: 5000 });
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

  async resortEntireList(): Promise<void> {
    // Force a full resort by passing true to startSort
    await this.startSort(true);
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
    const itemCount = sortedItems.length;
    const percentages = this.tierPercentages();
    
    const tiers: TierGroup[] = [];
    let currentIndex = 0;
    
    // Calculate tier sizes using floor to avoid over-allocation
    const tierSizes: number[] = [];
    let allocatedItems = 0;
    
    for (let i = 0; i < this.tierNames.length; i++) {
      if (percentages[i] === 0) {
        tierSizes.push(0);
        continue;
      }
      
      const exactSize = itemCount * percentages[i] / 100;
      const tierSize = Math.floor(exactSize);
      tierSizes.push(tierSize);
      allocatedItems += tierSize;
    }
    
    // Distribute remaining items (due to rounding) to tiers with largest fractional parts
    let remainingItems = itemCount - allocatedItems;
    if (remainingItems > 0) {
      const fractionalParts = percentages.map((pct, i) => ({
        index: i,
        fraction: (itemCount * pct / 100) - tierSizes[i]
      }));
      
      // Sort by fractional part descending
      fractionalParts.sort((a, b) => b.fraction - a.fraction);
      
      // Give one extra item to tiers with largest fractional parts
      for (let i = 0; i < remainingItems; i++) {
        tierSizes[fractionalParts[i].index]++;
      }
    }
    
    // Build tier groups
    for (let i = 0; i < this.tierNames.length; i++) {
      if (percentages[i] === 0) {
        continue;
      }
      
      const tierSize = tierSizes[i];
      const endIndex = Math.min(currentIndex + tierSize, itemCount);
      
      tiers.push({
        tier: this.tierNames[i],
        items: currentIndex < itemCount ? sortedItems.slice(currentIndex, endIndex) : []
      });
      
      currentIndex = endIndex;
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
    this.tierPercentages.set([10, 20, 20, 20, 20, 10]);
    this.snackBar.open('Tier percentages reset to defaults', 'Close', { duration: 2000 });
  }
  
  // Save current list to database
  private async saveCurrentList(): Promise<void> {
    if (!this.currentListId() || !this.showResults()) {
      return;
    }
    
    try {
      const sortedItems = this.tieredItems().flatMap(tier => tier.items);
      
      const list: SortedList = {
        _id: this.currentListId(),
        listName: this.listName(),
        items: this.items(),
        sortedItems,
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
  
  // Update list name
  updateListName(newName: string): void {
    this.listName.set(newName);
    this.saveCurrentList();
    this.snackBar.open('List name updated', 'Close', { duration: 2000 });
  }
  
  // Update item name
  updateItemName(event: { tierIndex: number; itemIndex: number; oldName: string; newName: string }): void {
    // Update in tieredItems
    const tiers = [...this.tieredItems()];
    if (tiers[event.tierIndex]) {
      tiers[event.tierIndex] = {
        ...tiers[event.tierIndex],
        items: [...tiers[event.tierIndex].items]
      };
      tiers[event.tierIndex].items[event.itemIndex] = event.newName;
      this.tieredItems.set(tiers);
    }
    
    // Update in items array
    const itemsArray = [...this.items()];
    const itemIndex = itemsArray.indexOf(event.oldName);
    if (itemIndex !== -1) {
      itemsArray[itemIndex] = event.newName;
      this.items.set(itemsArray);
    }
    
    // Update in sortedItems array
    const sortedArray = [...this.sortedItems()];
    const sortedIndex = sortedArray.indexOf(event.oldName);
    if (sortedIndex !== -1) {
      sortedArray[sortedIndex] = event.newName;
      this.sortedItems.set(sortedArray);
    }
    
    this.saveCurrentList();
    this.snackBar.open('Item name updated', 'Close', { duration: 2000 });
  }
}
