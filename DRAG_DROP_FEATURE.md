# Drag-and-Drop and Advanced Settings Feature

## Overview
This update adds two major features to the List Sorter application:
1. **Drag-and-Drop functionality** for fine-tuning tier placements
2. **Advanced Settings panel** for customizing tier percentages

## Features

### 1. Drag-and-Drop Items Between Tiers
- **Reorder within tiers**: Drag items to reorder them within the same tier
- **Move between tiers**: Drag items from one tier to another to adjust their ranking
- **Visual feedback**: 
  - Drag handle icon appears on each item
  - Items highlight when hovering
  - Placeholder shows where the item will be dropped
  - Smooth animations during drag operations
- **Auto-save**: Changes are automatically saved to the database

### 2. Advanced Settings Panel
Located in the results view, this collapsible panel allows you to:
- **Customize tier percentages**: Adjust the percentage of items in each tier (S, A, B, C, D, F)
- **Real-time total**: See the total percentage as you adjust sliders
- **Apply changes**: Recalculate tier distribution with new percentages
- **Reset to defaults**: Restore default percentages (S: 10%, A: 20%, B: 30%, C: 25%, D: 10%, F: 5%)

## How to Use

### Drag-and-Drop
1. Complete a sort to view the tier list
2. Hover over any item to see the drag handle icon (☰)
3. Click and drag the handle to move the item
4. Drop it in a new position within the same tier or in a different tier
5. Changes are saved automatically

### Advanced Settings
1. In the results view, click "Advanced Settings" to expand the panel
2. Use the sliders to adjust tier percentages
3. Watch the total percentage update in real-time
4. Click "Apply & Recalculate" to redistribute items based on new percentages
5. Click "Reset to Defaults" to restore original percentages

## Technical Implementation

### Dependencies
- **Angular CDK Drag-Drop**: Provides drag-and-drop functionality
- **Angular Material Expansion Panel**: Collapsible settings panel
- **Angular Material Slider**: Percentage adjustment controls

### Key Components
- `onItemDrop()`: Handles drag-and-drop events
- `recalculateTiers()`: Redistributes items based on new percentages
- `getConnectedLists()`: Enables cross-tier dragging
- `saveCurrentList()`: Auto-saves changes to PouchDB

### Styling
- Custom drag preview with elevated shadow
- Drag handle with hover effects
- Color-coded tier badges in settings
- Smooth transitions and animations
- Responsive design for mobile devices

## User Experience Enhancements
- **Intuitive controls**: Familiar drag-and-drop interaction
- **Visual feedback**: Clear indicators for dragging and dropping
- **Flexibility**: Both manual (drag-drop) and automatic (percentage) adjustments
- **Persistence**: All changes saved automatically
- **Non-destructive**: Can always recalculate or manually adjust

## Future Enhancements
Potential improvements could include:
- Export tier list as image
- Share tier list via URL
- Undo/redo functionality
- Tier naming customization
- Color theme customization
