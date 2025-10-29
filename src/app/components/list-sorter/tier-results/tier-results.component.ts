import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TierGroup } from '../../../services/database.service';
import { TierSettingsComponent } from '../tier-settings/tier-settings.component';

@Component({
  selector: 'app-tier-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    DragDropModule,
    TierSettingsComponent
  ],
  templateUrl: './tier-results.component.html',
  styleUrl: './tier-results.component.scss'
})
export class TierResultsComponent {
  private snackBar = inject(MatSnackBar);

  // Inputs
  listName = input.required<string>();
  tieredItems = input.required<TierGroup[]>();
  tierPercentages = input.required<number[]>();
  tierNames = input.required<string[]>();

  // Outputs
  updateTierPercentage = output<{ index: number; value: number }>();
  recalculateTiers = output<void>();
  resetTierPercentages = output<void>();
  itemDrop = output<CdkDragDrop<string[]>>();
  hideResults = output<void>();
  createNewList = output<void>();
  resortEntireList = output<void>();
  listNameChange = output<string>();
  itemNameChange = output<{ tierIndex: number; itemIndex: number; oldName: string; newName: string }>();

  // Edit state
  protected editingListName = signal(false);
  protected editingListNameValue = signal('');
  protected editingItem = signal<{ tierIndex: number; itemIndex: number } | null>(null);
  protected editingItemValue = signal('');

  onUpdateTierPercentage(event: { index: number; value: number }): void {
    this.updateTierPercentage.emit(event);
  }

  onRecalculateTiers(): void {
    this.recalculateTiers.emit();
  }

  onResetTierPercentages(): void {
    this.resetTierPercentages.emit();
  }

  onItemDrop(event: CdkDragDrop<string[]>): void {
    this.itemDrop.emit(event);
  }

  onHideResults(): void {
    this.hideResults.emit();
  }

  onCreateNewList(): void {
    this.createNewList.emit();
  }

  onResortEntireList(): void {
    this.resortEntireList.emit();
  }

  getConnectedLists(currentIndex: number): string[] {
    return this.tieredItems()
      .map((_, index) => `tier-${index}`)
      .filter((_, index) => index !== currentIndex);
  }

  async copyToClipboard(): Promise<void> {
    const tierList = this.formatTierListAsText();
    
    try {
      await navigator.clipboard.writeText(tierList);
      this.snackBar.open('Tier list copied to clipboard!', 'Close', { duration: 3000 });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      this.fallbackCopyToClipboard(tierList);
    }
  }

  private formatTierListAsText(): string {
    const lines: string[] = [];
    lines.push(`${this.listName()} - Tier List`);
    lines.push('='.repeat(this.listName().length + 13));
    lines.push('');

    for (const tierGroup of this.tieredItems()) {
      lines.push(`[${tierGroup.tier}]`);
      for (const item of tierGroup.items) {
        lines.push(`  • ${item}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.snackBar.open('Tier list copied to clipboard!', 'Close', { duration: 3000 });
    } catch (error) {
      this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 3000 });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  // List name editing
  startEditingListName(): void {
    this.editingListNameValue.set(this.listName());
    this.editingListName.set(true);
  }

  saveListName(): void {
    const newName = this.editingListNameValue().trim();
    if (newName && newName !== this.listName()) {
      this.listNameChange.emit(newName);
    }
    this.editingListName.set(false);
  }

  cancelEditingListName(): void {
    this.editingListName.set(false);
  }

  // Item name editing
  startEditingItem(tierIndex: number, itemIndex: number, currentName: string): void {
    this.editingItem.set({ tierIndex, itemIndex });
    this.editingItemValue.set(currentName);
  }

  saveItemName(tierIndex: number, itemIndex: number, oldName: string): void {
    const newName = this.editingItemValue().trim();
    if (newName && newName !== oldName) {
      this.itemNameChange.emit({ tierIndex, itemIndex, oldName, newName });
    }
    this.editingItem.set(null);
  }

  cancelEditingItem(): void {
    this.editingItem.set(null);
  }

  isEditingItem(tierIndex: number, itemIndex: number): boolean {
    const editing = this.editingItem();
    return editing !== null && editing.tierIndex === tierIndex && editing.itemIndex === itemIndex;
  }
}
