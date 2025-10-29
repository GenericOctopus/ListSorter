import { Component, input, output, signal, computed, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatStepper, StepperOrientation } from '@angular/material/stepper';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

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
    MatSnackBarModule,
    MatStepperModule
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
  editItem = output<{ oldName: string; newName: string }>();

  // Edit state
  protected editingItemIndex = signal<number | null>(null);
  protected editingItemValue = signal('');

  // Stepper reference
  stepper = viewChild<MatStepper>('stepper');

  // Breakpoint observer for responsive stepper
  private breakpointObserver = inject(BreakpointObserver);

  // Stepper orientation based on screen size
  stepperOrientation: Observable<StepperOrientation> = this.breakpointObserver
    .observe([Breakpoints.XSmall, Breakpoints.Small])
    .pipe(map(({ matches }) => (matches ? 'vertical' : 'horizontal')));

  // Computed signals for stepper validation
  protected isStep1Valid = computed(() => {
    return this.listName().trim().length > 0;
  });

  protected isStep2Valid = computed(() => {
    return this.items().length >= 2;
  });

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

  // Item editing
  startEditingItem(index: number, currentName: string): void {
    this.editingItemIndex.set(index);
    this.editingItemValue.set(currentName);
  }

  saveItemEdit(oldName: string): void {
    const newName = this.editingItemValue().trim();
    if (newName && newName !== oldName) {
      this.editItem.emit({ oldName, newName });
    }
    this.editingItemIndex.set(null);
  }

  cancelEditingItem(): void {
    this.editingItemIndex.set(null);
  }

  isEditingItem(index: number): boolean {
    return this.editingItemIndex() === index;
  }

  // Stepper navigation methods
  goToNextStep(): void {
    const stepperInstance = this.stepper();
    if (stepperInstance) {
      stepperInstance.next();
    }
  }

  goToPreviousStep(): void {
    const stepperInstance = this.stepper();
    if (stepperInstance) {
      stepperInstance.previous();
    }
  }

  resetStepper(): void {
    const stepperInstance = this.stepper();
    if (stepperInstance) {
      stepperInstance.reset();
    }
  }
}
