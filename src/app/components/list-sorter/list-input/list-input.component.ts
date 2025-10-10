import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-list-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './list-input.component.html',
  styleUrl: './list-input.component.scss'
})
export class ListInputComponent {
  // Inputs
  listName = input.required<string>();
  items = input.required<string[]>();
  currentItem = input.required<string>();
  pastedText = input.required<string>();
  isDisabled = input<boolean>(false);
  canAddItem = input<boolean>(false);
  canStartSort = input<boolean>(false);
  currentListId = input<string | undefined>(undefined);

  // Outputs
  listNameChange = output<string>();
  currentItemChange = output<string>();
  pastedTextChange = output<string>();
  addItem = output<void>();
  removeItem = output<string>();
  startSort = output<void>();
  clearList = output<void>();
  fileSelected = output<File>();
  addPastedItems = output<void>();

  constructor(private snackBar: MatSnackBar) {}

  onListNameChange(value: string): void {
    this.listNameChange.emit(value);
  }

  onCurrentItemChange(value: string): void {
    this.currentItemChange.emit(value);
  }

  onPastedTextChange(value: string): void {
    this.pastedTextChange.emit(value);
  }

  onAddItem(): void {
    this.addItem.emit();
  }

  onRemoveItem(item: string): void {
    this.removeItem.emit(item);
  }

  onStartSort(): void {
    this.startSort.emit();
  }

  onClearList(): void {
    this.clearList.emit();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onAddItem();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    this.fileSelected.emit(file);
    // Reset the input so the same file can be selected again
    input.value = '';
  }

  onAddPastedItems(): void {
    this.addPastedItems.emit();
  }
}
