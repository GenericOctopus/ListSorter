import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ComparisonPair {
  itemA: string;
  itemB: string;
}

export interface SortState {
  isActive: boolean;
  currentPair: ComparisonPair | null;
  progress: number;
  totalComparisons: number;
  completedComparisons: number;
}

@Injectable({
  providedIn: 'root'
})
export class MergeSortService {
  private sortStateSubject = new BehaviorSubject<SortState>({
    isActive: false,
    currentPair: null,
    progress: 0,
    totalComparisons: 0,
    completedComparisons: 0
  });

  public sortState$: Observable<SortState> = this.sortStateSubject.asObservable();

  private items: string[] = [];
  private comparisons: Map<string, number> = new Map();
  private pendingComparisons: ComparisonPair[] = [];
  private resolveComparison: ((result: number) => void) | null = null;
  private sortPromiseResolve: ((result: string[]) => void) | null = null;
  private sortedItems: string[] = [];
  private newItems: string[] = [];

  async startSort(items: string[], sortedItems?: string[]): Promise<string[]> {
    this.items = [...items];
    this.comparisons.clear();
    this.pendingComparisons = [];
    
    // If we have already sorted items, only sort the new ones
    if (sortedItems && sortedItems.length > 0) {
      this.sortedItems = [...sortedItems];
      this.newItems = items.filter(item => !sortedItems.includes(item));
      
      if (this.newItems.length === 0) {
        // No new items, return the sorted list as-is
        return sortedItems;
      }
      
      // Estimate comparisons for incremental sort (binary search for each new item)
      const estimatedComparisons = this.newItems.length * Math.ceil(Math.log2(sortedItems.length + 1));
      
      this.updateState({
        isActive: true,
        currentPair: null,
        progress: 0,
        totalComparisons: estimatedComparisons,
        completedComparisons: 0
      });

      return new Promise((resolve) => {
        this.sortPromiseResolve = resolve;
        this.performIncrementalSort().then((sorted) => {
          this.updateState({
            isActive: false,
            currentPair: null,
            progress: 100,
            totalComparisons: this.sortStateSubject.value.totalComparisons,
            completedComparisons: this.sortStateSubject.value.totalComparisons
          });
          resolve(sorted);
        });
      });
    } else {
      // Full sort from scratch
      // Estimate total comparisons (worst case for merge sort is n * log(n))
      const estimatedComparisons = Math.ceil(items.length * Math.log2(items.length));
      
      this.updateState({
        isActive: true,
        currentPair: null,
        progress: 0,
        totalComparisons: estimatedComparisons,
        completedComparisons: 0
      });

      return new Promise((resolve) => {
        this.sortPromiseResolve = resolve;
        this.performMergeSort(this.items).then((sorted) => {
          this.updateState({
            isActive: false,
            currentPair: null,
            progress: 100,
            totalComparisons: this.sortStateSubject.value.totalComparisons,
            completedComparisons: this.sortStateSubject.value.totalComparisons
          });
          resolve(sorted);
        });
      });
    }
  }

  private async performMergeSort(arr: string[]): Promise<string[]> {
    if (arr.length <= 1) {
      return arr;
    }

    const mid = Math.floor(arr.length / 2);
    const left = await this.performMergeSort(arr.slice(0, mid));
    const right = await this.performMergeSort(arr.slice(mid));

    return await this.merge(left, right);
  }

  private async merge(left: string[], right: string[]): Promise<string[]> {
    const result: string[] = [];
    let leftIndex = 0;
    let rightIndex = 0;

    while (leftIndex < left.length && rightIndex < right.length) {
      const comparison = await this.compare(left[leftIndex], right[rightIndex]);
      
      if (comparison <= 0) {
        result.push(left[leftIndex]);
        leftIndex++;
      } else {
        result.push(right[rightIndex]);
        rightIndex++;
      }
    }

    return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
  }

  private async compare(itemA: string, itemB: string): Promise<number> {
    const key = this.getComparisonKey(itemA, itemB);
    
    if (this.comparisons.has(key)) {
      return this.comparisons.get(key)!;
    }

    // Request user input
    return new Promise((resolve) => {
      this.resolveComparison = resolve;
      this.updateState({
        ...this.sortStateSubject.value,
        currentPair: { itemA, itemB }
      });
    });
  }

  submitComparison(itemA: string, itemB: string, result: 'A' | 'B' | 'Equal'): void {
    const key = this.getComparisonKey(itemA, itemB);
    const value = result === 'A' ? -1 : result === 'B' ? 1 : 0;
    
    this.comparisons.set(key, value);
    
    const currentState = this.sortStateSubject.value;
    const completedComparisons = currentState.completedComparisons + 1;
    const progress = currentState.totalComparisons > 0 
      ? Math.round((completedComparisons / currentState.totalComparisons) * 100)
      : 0;

    this.updateState({
      ...currentState,
      currentPair: null,
      completedComparisons,
      progress
    });

    if (this.resolveComparison) {
      this.resolveComparison(value);
      this.resolveComparison = null;
    }
  }

  cancelSort(): void {
    this.updateState({
      isActive: false,
      currentPair: null,
      progress: 0,
      totalComparisons: 0,
      completedComparisons: 0
    });
    
    if (this.sortPromiseResolve) {
      this.sortPromiseResolve([]);
      this.sortPromiseResolve = null;
    }
  }

  private getComparisonKey(itemA: string, itemB: string): string {
    return [itemA, itemB].sort().join('|||');
  }

  private updateState(state: SortState): void {
    this.sortStateSubject.next(state);
  }

  /**
   * Incrementally sort new items into an already sorted list using binary search
   */
  private async performIncrementalSort(): Promise<string[]> {
    let result = [...this.sortedItems];
    
    // Insert each new item into the sorted list
    for (const newItem of this.newItems) {
      const position = await this.findInsertPosition(result, newItem);
      result.splice(position, 0, newItem);
    }
    
    return result;
  }

  /**
   * Use binary search with user comparisons to find the correct position for a new item
   */
  private async findInsertPosition(sortedArray: string[], newItem: string): Promise<number> {
    if (sortedArray.length === 0) {
      return 0;
    }
    
    let left = 0;
    let right = sortedArray.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = await this.compare(newItem, sortedArray[mid]);
      
      if (comparison <= 0) {
        // newItem should go before or at mid position
        right = mid;
      } else {
        // newItem should go after mid position
        left = mid + 1;
      }
    }
    
    return left;
  }
}
