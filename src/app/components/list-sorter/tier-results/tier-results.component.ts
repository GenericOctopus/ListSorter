import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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

  getConnectedLists(currentIndex: number): string[] {
    return this.tieredItems()
      .map((_, index) => `tier-${index}`)
      .filter((_, index) => index !== currentIndex);
  }
}
