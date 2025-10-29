import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface TierSettingsDialogData {
  tierPercentages: number[];
  tierNames: string[];
}

@Component({
  selector: 'app-tier-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tier-settings-dialog.component.html',
  styleUrl: './tier-settings-dialog.component.scss'
})
export class TierSettingsDialogComponent {
  private dialogRef = inject(MatDialogRef<TierSettingsDialogComponent>);
  protected data = inject<TierSettingsDialogData>(MAT_DIALOG_DATA);

  // Local copy of percentages for editing
  protected tierPercentages: number[] = [...this.data.tierPercentages];

  updateTierPercentage(index: number, value: number): void {
    this.tierPercentages[index] = value;
  }

  validateTierPercentage(index: number): void {
    // Ensure value is within bounds
    if (this.tierPercentages[index] < 0) {
      this.tierPercentages[index] = 0;
    } else if (this.tierPercentages[index] > 100) {
      this.tierPercentages[index] = 100;
    }
  }

  getTotalPercentage(): number {
    return this.tierPercentages.reduce((sum, val) => sum + val, 0);
  }

  formatLabel(value: number): string {
    return `${value}%`;
  }

  onApply(): void {
    this.dialogRef.close({ tierPercentages: this.tierPercentages, action: 'apply' });
  }

  onReset(): void {
    this.dialogRef.close({ action: 'reset' });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
