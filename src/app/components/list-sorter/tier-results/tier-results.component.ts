import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TierGroup } from '../../../services/database.service';
import { TierSettingsComponent } from '../tier-settings/tier-settings.component';

@Component({
  selector: 'app-tier-results',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
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
  showAdvancedSettings = input.required<boolean>();

  // Outputs
  showAdvancedSettingsChange = output<boolean>();
  updateTierPercentage = output<{ index: number; value: number }>();
  validateTierPercentage = output<number>();
  recalculateTiers = output<void>();
  resetTierPercentages = output<void>();
  itemDrop = output<CdkDragDrop<string[]>>();
  hideResults = output<void>();
  createNewList = output<void>();
  resortEntireList = output<void>();

  onShowAdvancedSettingsChange(value: boolean): void {
    this.showAdvancedSettingsChange.emit(value);
  }

  onUpdateTierPercentage(event: { index: number; value: number }): void {
    this.updateTierPercentage.emit(event);
  }

  onValidateTierPercentage(index: number): void {
    this.validateTierPercentage.emit(index);
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
}
