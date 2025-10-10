import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SortState } from '../../../services/merge-sort.service';

@Component({
  selector: 'app-sorting-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule
  ],
  templateUrl: './sorting-comparison.component.html',
  styleUrl: './sorting-comparison.component.scss'
})
export class SortingComparisonComponent {
  // Inputs
  sortState = input.required<SortState>();

  // Outputs
  selectOption = output<'A' | 'B' | 'Equal'>();
  cancelSort = output<void>();

  onSelectOption(option: 'A' | 'B' | 'Equal'): void {
    this.selectOption.emit(option);
  }

  onCancelSort(): void {
    this.cancelSort.emit();
  }
}
