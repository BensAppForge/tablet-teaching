# Question Editors Guide

This document provides an overview of the question editors implemented in the Tablet Teaching app, focusing on their UI/UX design and user flow.

## Completed Question Types

The following question types have been fully implemented and tested:

1. Multiple Choice
2. True/False
3. Gap Fill

Each of these editors includes per-question settings for time limits, points, and multipliers.

## Common Features Across All Question Editors

All question editors share these common features:

- **Card-based UI**: Each editor is contained within a card component with a consistent layout
- **Smooth Animations**: All transitions and state changes use framer-motion for fluid animations
- **Per-Question Settings**: Custom time, points, and multiplier settings with toggle switches
- **Delete Confirmation**: Confirmation dialog with "don't show again" option
- **Responsive Design**: Adapts to different screen sizes

## Multiple Choice Editor

The Multiple Choice editor allows teachers to create questions with multiple answer options, only one of which is correct.

### UI Components
- Text input field for the question text
- Add/remove buttons for options
- Radio buttons to select the correct answer
- Per-question settings panel

### User Flow
1. Teacher enters the question text
2. Teacher adds multiple answer options (minimum of 2)
3. Teacher selects which option is correct
4. Teacher can optionally customize time, points, and multiplier settings

### Features
- Dynamic option management (add/remove)
- Visual indication of the correct answer
- Validation to ensure at least 2 options and 1 correct answer

## True/False Editor

The True/False editor provides a simplified interface for creating boolean questions.

### UI Components
- Text input field for the question statement
- True/False toggle switch
- Per-question settings panel

### User Flow
1. Teacher enters the question statement
2. Teacher selects whether the statement is true or false
3. Teacher can optionally customize time, points, and multiplier settings

### Features
- Simple toggle for true/false selection
- Clear visual indication of the current selection
- Streamlined interface for quick creation

## Gap Fill Editor

The Gap Fill editor implements a two-step approach for creating fill-in-the-blank questions.

### UI Components
- Text area for entering the complete text
- Interactive preview area for selecting gaps
- List of created gaps with position indicators
- Per-question settings panel

### User Flow
1. Teacher enters the complete text in the textarea
2. Teacher selects words or phrases in the preview to create gaps
3. Gaps are automatically numbered based on their position in the text
4. Teacher can click on gaps in the preview to remove them
5. Teacher can optionally customize time, points, and multiplier settings

### Features
- Position-based gap indexing (gaps are numbered by position, not creation order)
- Visual highlighting of gaps with subscript numbers
- Proper handling of duplicate text (e.g., multiple instances of the same word)
- Persistent gap positions when editing existing questions

## Planned Question Types

The following question types are planned but not yet fully implemented:

1. **Matching**: Match items from two columns
2. **Reordering**: Arrange items in the correct order

These question types will be implemented in the future and will include the same per-question settings as the completed editors.

## Settings and Preferences

The app includes a user preferences system that remembers user choices:

- **Confirmation Dialogs**: Users can choose to disable confirmation dialogs for actions like deleting questions
- **Settings Reset**: Users can reset their preferences through the settings dialog
- **Persistence**: Preferences are stored per user and persist between sessions

## Technical Implementation

All question editors are implemented as React components with the following characteristics:

- **State Management**: React useState and useEffect hooks
- **Animations**: framer-motion library for smooth transitions
- **Styling**: Tailwind CSS with shadcn/ui components
- **Validation**: Client-side validation to ensure data integrity
- **Persistence**: Firebase Firestore for data storage
