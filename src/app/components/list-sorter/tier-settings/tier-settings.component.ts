import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tier-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tier-settings.component.html',
  styleUrl: './tier-settings.component.scss'
})
export class TierSettingsComponent {
  // Inputs
  tierPercentages = input.required<number[]>();
  tierNames = input.required<string[]>();
  showAdvancedSettings = input.required<boolean>();

  // Outputs
  showAdvancedSettingsChange = output<boolean>();
  updateTierPercentage = output<{ index: number; value: number }>();
  validateTierPercentage = output<number>();
  recalculateTiers = output<void>();
  resetTierPercentages = output<void>();

  onShowAdvancedSettingsChange(value: boolean): void {
    this.showAdvancedSettingsChange.emit(value);
  }

  onUpdateTierPercentage(index: number, value: number): void {
    this.updateTierPercentage.emit({ index, value });
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

  getTierPercentage(index: number): number {
    return this.tierPercentages()[index];
  }

  getTotalPercentage(): number {
    return this.tierPercentages().reduce((sum, val) => sum + val, 0);
  }

  formatLabel(value: number): string {
    return `${value}%`;
  }
}
