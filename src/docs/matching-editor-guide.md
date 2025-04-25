# Matching Editor Component Guide

## Overview

The MatchingEditor component is a sophisticated UI element that allows teachers to create matching questions. In these questions, students must correctly match items from the left column with corresponding items in the right column. The component also supports distractors (extra right-side items that don't match with any left items).

## Key Features

- **Interactive Connection System**: Users can create connections between left and right items by clicking on connection points
- **Visual Feedback**: Connections are displayed as colored bezier curves with matching connection points
- **Drag-Free Experience**: No drag-and-drop required; connections are made by selecting points
- **Distractor Support**: Teachers can add extra right-side items as distractors
- **Pair Management**: Add or remove pairs with a single button click
- **Shuffle Functionality**: Randomize the order of right-side items and distractors
- **Validation**: Visual feedback when all left items are properly connected

## Component Structure

The MatchingEditor consists of several key sub-components:

1. **LeftItem**: Renders items in the left column with connection points
2. **RightItem**: Renders items in the right column with connection points
3. **DistractorItem**: Renders distractor items (right-side items with no matching left item)
4. **Xarrow**: Renders the bezier curve connections between matched items

## State Management

The component manages several pieces of state:

- **questionText**: The instruction text for the matching question
- **leftItems**: Array of items in the left column
- **rightItems**: Array of items in the right column
- **distractors**: Array of distractor items
- **connections**: Array of connection objects linking left and right items
- **selectedItem**: Currently selected connection point (if any)
- **shuffleKey**: Used to force re-rendering of connections when items are added/removed/shuffled

## Connection Logic

Connections are established through a two-step process:

1. User clicks a connection point on either the left or right side (this becomes the "selectedItem")
2. User clicks a connection point on the opposite side to complete the connection

The component handles various scenarios:

- Clicking the same connection point twice deselects it
- Clicking a different connection point on the same side switches the selection
- Connections are stored as pairs of indices (leftIndex, rightIndex)

## Data Structure

The component works with the MatchingQuestion interface:

```typescript
interface MatchingQuestion extends BaseQuestion {
  type: "matching";
  leftItems: string[];
  rightItems: string[];
  correctMatches: number[];  // Indices mapping left items to right items
  distractors?: string[];
}
```

## Animation

The component uses framer-motion for smooth animations:

- Entry/exit animations for items
- Layout animations when items are added/removed
- Hover/tap effects on connection points and buttons

## TODO

1. **Add Question Settings Form Elements**:
   - [ ] Add time limit setting
   - [ ] Add points setting
   - [ ] Add shuffle setting (whether items should be shuffled for students)
   - [ ] Add feedback options
   - [ ] Add explanation field for correct answers

2. **Accessibility Improvements**:
   - [ ] Add keyboard navigation for connection creation
   - [ ] Improve screen reader support
   - [ ] Add high contrast mode

3. **Additional Features**:
   - [ ] Support for image-based matching items
   - [ ] Support for categorization (multiple left items matching to one right item)
   - [ ] Preview mode to test the matching experience

## Usage Example

```tsx
<MatchingEditor
  question={matchingQuestion}
  onChange={handleQuestionChange}
  onDelete={handleDeleteQuestion}
  showDelete={true}
/>
```

## Best Practices

1. Always provide at least 2 pairs of items
2. Keep item text concise for better visual layout
3. Use distractors sparingly to avoid overwhelming students
4. Ensure all left items have a matching right item before saving
