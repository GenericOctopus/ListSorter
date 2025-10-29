import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TierSettingsDialogComponent } from './tier-settings-dialog.component';

@Component({
  selector: 'app-tier-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tier-settings.component.html',
  styleUrl: './tier-settings.component.scss'
})
export class TierSettingsComponent {
  private dialog = inject(MatDialog);

  // Inputs
  tierPercentages = input.required<number[]>();
  tierNames = input.required<string[]>();

  // Outputs
  updateTierPercentage = output<{ index: number; value: number }>();
  recalculateTiers = output<void>();
  resetTierPercentages = output<void>();

  openSettingsDialog(): void {
    const dialogRef = this.dialog.open(TierSettingsDialogComponent, {
      width: '600px',
      data: {
        tierPercentages: this.tierPercentages(),
        tierNames: this.tierNames()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'apply') {
          // Update all tier percentages
          result.tierPercentages.forEach((value: number, index: number) => {
            this.updateTierPercentage.emit({ index, value });
          });
          // Trigger recalculation
          this.recalculateTiers.emit();
        } else if (result.action === 'reset') {
          this.resetTierPercentages.emit();
        }
      }
    });
  }
}
