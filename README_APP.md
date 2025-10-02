# List Sorter Application

A sophisticated Angular application that sorts lists based on user preferences using a merge sort algorithm with interactive comparisons.

## Features

### Core Functionality
- **Interactive List Creation**: Add items to your list with a clean, intuitive interface
- **Merge Sort Algorithm**: Efficiently sorts items by asking you to compare pairs
- **User-Driven Comparisons**: You decide which item you prefer in each comparison
- **Progress Tracking**: Visual progress bar shows sorting completion
- **Local Storage**: All lists are saved locally using PouchDB
- **Session Management**: Save, load, and manage multiple sorting sessions

### Technology Stack
- **Angular 20**: Modern Angular with standalone components and signals
- **Angular Material**: Beautiful Material Design UI components
- **PouchDB**: Client-side database for persistent local storage
- **TypeScript**: Type-safe development
- **SCSS**: Styled with modern CSS features

## How It Works

### 1. Create Your List
- Enter a name for your list (e.g., "Favorite Movies", "Best Restaurants")
- Add items one by one using the input field
- Items appear as chips that can be removed if needed

### 2. Start Sorting
- Click "Start Sorting" when you have at least 2 items
- The merge sort algorithm begins asking you to compare pairs

### 3. Make Comparisons
- For each pair, choose which item you prefer:
  - Click the first option if you prefer it
  - Click the second option if you prefer it
  - Click "They're Equal" if you have no preference
- Progress bar shows how many comparisons remain

### 4. View Results
- Once complete, see your personalized ranking
- Top 3 items get special trophy icons
- Results are automatically saved to local storage

### 5. Manage Sessions
- View all saved sessions in the sidebar
- Load previous sessions to view results
- Delete old sessions you no longer need

## Algorithm Details

The application uses **Merge Sort** with user comparisons:
- **Time Complexity**: O(n log n) comparisons
- **Efficient**: Minimizes the number of questions asked
- **Consistent**: Remembers your previous comparisons within a session
- **Stable**: Equal items maintain their relative order

### Why Merge Sort?
- Predictable number of comparisons
- Efficient for any list size
- Guarantees optimal sorting with minimal user input
- Better than bubble sort or selection sort for user-driven comparisons

## Project Structure

```
src/app/
├── components/
│   └── list-sorter/
│       ├── list-sorter.component.ts      # Main component logic
│       ├── list-sorter.component.html    # Template
│       └── list-sorter.component.scss    # Styles
├── services/
│   ├── database.service.ts               # PouchDB integration
│   └── merge-sort.service.ts             # Sorting algorithm
├── app.ts                                # Root component
├── app.config.ts                         # App configuration
└── app.html                              # Root template
```

## Running the Application

### Development Server
```bash
npm start
```
Navigate to `http://localhost:4200/`

### Build
```bash
npm run build
```

### Production Build
```bash
npm run build --configuration production
```

## Usage Examples

### Example 1: Ranking Movies
1. List Name: "Favorite Movies"
2. Add items: "The Matrix", "Inception", "Interstellar", "The Prestige"
3. Start sorting and answer comparisons
4. Get your personalized movie ranking

### Example 2: Restaurant Preferences
1. List Name: "Best Pizza Places"
2. Add your local pizza restaurants
3. Compare them pairwise
4. Discover your true favorite

### Example 3: Task Prioritization
1. List Name: "Project Tasks"
2. Add all your tasks
3. Sort by importance/urgency
4. Get a prioritized task list

## Features in Detail

### Material Design UI
- Clean, modern interface
- Responsive design for mobile and desktop
- Smooth animations and transitions
- Accessible components

### Local Data Persistence
- All data stored in browser's IndexedDB via PouchDB
- No server required
- Data persists across sessions
- Privacy-focused (data never leaves your device)

### Smart Comparison System
- Caches comparison results
- Minimizes redundant questions
- Shows progress in real-time
- Can be cancelled at any time

## Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Any modern browser with IndexedDB support

## Future Enhancements
- Export results to CSV/JSON
- Import lists from files
- Undo/redo during sorting
- Custom themes
- Share results (with privacy controls)
- Multiple sorting algorithms
- Batch comparison mode

## License
MIT

## Contributing
Contributions welcome! Please feel free to submit issues or pull requests.
