# Change Tracking & History Feature Guide

## Overview

This feature adds visual change highlighting and file-level history tracking when autosave is disabled in hotnote. It allows users to see what has changed in their documents and provides unlimited undo/redo capabilities across editing sessions.

## Feature Requirements

### Core Functionality

1. **Change Highlighting**
   - When autosave is OFF: highlight changed text with background color
   - Works in both Source View (CodeMirror) and WYSIWYG View (Milkdown)
   - Highlights are cleared when autosave is re-enabled

2. **History Tracking**
   - Time-based snapshots every 5 seconds when autosave is OFF
   - Unlimited storage (no cap on number of snapshots)
   - Each snapshot includes: content, timestamp, cursor position, scroll position
   - History is stored per-file in the HN session properties file
   - History is completely cleared when autosave is re-enabled

3. **File-Level Undo/Redo**
   - When autosave is OFF: replace editor's built-in undo with file-level history
   - Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z navigate through snapshots
   - Restores content, cursor position, and scroll position
   - When autosave is ON: use standard editor undo/redo

4. **Toaster Notification**
   - Show toaster message when opening a file with unsaved changes
   - Message: "This file has unsaved changes"
   - User can dismiss the notification

## Architecture

### New Components

#### 1. History Manager (`src/storage/history-manager.js`)

Manages document snapshots and navigation through history.

```javascript
class HistoryManager {
  constructor() {
    this.histories = new Map(); // fileRelativePath -> FileHistory
    this.snapshotInterval = 5000; // 5 seconds
    this.timer = null;
  }

  // Core methods
  createSnapshot(filePath, content, cursor, scroll)
  undo(filePath)
  redo(filePath)
  clearHistory(filePath)
  clearAllHistories()
  getCurrentIndex(filePath)
  canUndo(filePath)
  canRedo(filePath)

  // Timer methods
  startSnapshotTimer(getCurrentFileState)
  stopSnapshotTimer()
}

class FileHistory {
  constructor() {
    this.snapshots = [];
    this.currentIndex = -1;
  }
}

class Snapshot {
  constructor(content, timestamp, cursor, scroll) {
    this.content = content;
    this.timestamp = timestamp;
    this.cursor = { line, column };
    this.scroll = { top, left };
  }
}
```

#### 2. Session Properties Extension

Extend the existing session properties file structure to include file histories.

**New Schema Addition:**
```javascript
{
  version: '1.0',
  folderName: '<folder-name>',
  lastModified: <timestamp>,
  session: { /* existing session data */ },
  comments: [ /* existing comments */ ],
  fileHistory: {
    '<file-relative-path>': {
      snapshots: [
        {
          content: '<document-content>',
          timestamp: <number>,
          cursor: { line: <number>, column: <number> },
          scroll: { top: <number>, left: <number> }
        }
      ],
      currentIndex: <number>
    }
  }
}
```

**New Functions in `session-manager.js`:**
- `saveFileHistory(filePath, history)`
- `loadFileHistory(filePath)`
- `clearFileHistory(filePath)`
- `clearAllFileHistories()`

#### 3. Change Highlighting Extensions

**CodeMirror Extension (`src/editors/source-view-changes.js`):**
```javascript
// Uses CodeMirror 6 StateField and Decoration APIs
const changeHighlightField = StateField.define({
  create() { return Decoration.none },
  update(decorations, tr) {
    // Compare current content with originalContent
    // Create decorations for changed ranges
    // Return new decoration set
  }
});

const changeHighlightTheme = EditorView.baseTheme({
  ".cm-changed-text": {
    backgroundColor: "rgba(255, 213, 79, 0.3)" // Yellow highlight
  }
});

export function createChangeHighlightExtension(getOriginalContent) {
  return [changeHighlightField, changeHighlightTheme];
}
```

**Milkdown Plugin (`src/editors/wysiwyg-view-changes.js`):**
```javascript
// Uses Milkdown plugin system with ProseMirror decorations
import { $prose } from '@milkdown/utils';

export const changeHighlightPlugin = () => {
  return $prose((ctx) => {
    // Create ProseMirror plugin
    // Track changes and apply decorations
    // Highlight changed nodes with background color
  });
};
```

## Implementation Plan (TDD)

### Phase 1: History Manager (Unit Tests)

**Test File:** `tests/unit/history-manager.test.js`

```javascript
describe('HistoryManager', () => {
  describe('Snapshot Creation', () => {
    it('should create snapshot with content, timestamp, cursor, scroll');
    it('should increment currentIndex when creating snapshot');
    it('should truncate forward history when creating snapshot after undo');
  });

  describe('Undo/Redo', () => {
    it('should undo to previous snapshot');
    it('should redo to next snapshot');
    it('should return correct content, cursor, scroll on undo');
    it('should return null when undoing at earliest snapshot');
    it('should return null when redoing at latest snapshot');
    it('should update currentIndex correctly');
  });

  describe('Clear History', () => {
    it('should clear all snapshots for a file');
    it('should reset currentIndex to -1');
    it('should clear all histories for all files');
  });

  describe('Multiple Files', () => {
    it('should maintain independent histories for different files');
    it('should not affect other files when clearing one file');
  });

  describe('Boundary Conditions', () => {
    it('should handle empty history');
    it('should handle single snapshot');
    it('should correctly report canUndo/canRedo');
  });
});
```

**Implementation:** `src/storage/history-manager.js`

### Phase 2: Session Properties Extension (Unit Tests)

**Test File:** `tests/unit/session-manager.test.js`

```javascript
describe('Session Manager - File History', () => {
  describe('Save File History', () => {
    it('should save file history to session properties');
    it('should preserve existing session data when saving history');
    it('should handle multiple files with independent histories');
  });

  describe('Load File History', () => {
    it('should load file history from session properties');
    it('should return empty history if file has no history');
    it('should correctly deserialize snapshots');
  });

  describe('Clear File History', () => {
    it('should remove file history from session properties');
    it('should not affect other files\' histories');
    it('should clear all file histories when requested');
  });

  describe('Session File Format', () => {
    it('should validate fileHistory schema');
    it('should handle missing fileHistory gracefully (backward compat)');
  });
});
```

**Implementation:** Extend `src/storage/session-manager.js`

### Phase 3: CodeMirror Change Highlighting (Unit Tests)

**Test File:** `tests/unit/source-view-highlighting.test.js`

```javascript
describe('CodeMirror Change Highlighting', () => {
  describe('Change Detection', () => {
    it('should detect changed characters');
    it('should detect added lines');
    it('should detect removed lines');
    it('should handle multiple non-contiguous changes');
  });

  describe('Decoration Application', () => {
    it('should apply background color to changed ranges');
    it('should update decorations when content changes');
    it('should remove decorations when content matches original');
  });

  describe('Enable/Disable', () => {
    it('should add decorations when enabled');
    it('should remove decorations when disabled');
    it('should respond to autosave state changes');
  });

  describe('Edge Cases', () => {
    it('should handle empty document');
    it('should handle very long documents');
    it('should handle rapid edits');
  });
});
```

**Implementation:** Create `src/editors/source-view-changes.js`, integrate into `src/editors/source-view.js`

### Phase 4: Milkdown Change Highlighting (Unit Tests)

**Test File:** `tests/unit/wysiwyg-view-highlighting.test.js`

```javascript
describe('Milkdown Change Highlighting', () => {
  describe('Change Detection', () => {
    it('should detect changed text nodes');
    it('should detect added nodes');
    it('should detect removed nodes');
    it('should handle formatting changes (bold, italic, etc.)');
  });

  describe('Decoration Application', () => {
    it('should apply background color to changed nodes');
    it('should preserve formatting while highlighting');
    it('should update decorations on content change');
  });

  describe('Enable/Disable', () => {
    it('should add decorations when enabled');
    it('should remove decorations when disabled');
  });

  describe('ProseMirror Integration', () => {
    it('should correctly map positions in ProseMirror document');
    it('should handle complex document structures (lists, tables, etc.)');
  });
});
```

**Implementation:** Create `src/editors/wysiwyg-view-changes.js`, integrate into `src/editors/wysiwyg-view.js`

### Phase 5: Editor Undo Replacement (Unit Tests)

**Test File:** `tests/unit/editor-undo.test.js`

```javascript
describe('Editor Undo System', () => {
  describe('Autosave OFF - File-Level Undo', () => {
    it('should use file history for Cmd+Z when autosave is OFF');
    it('should use file history for Cmd+Shift+Z when autosave is OFF');
    it('should restore content on undo');
    it('should restore cursor position on undo');
    it('should restore scroll position on undo');
    it('should handle redo correctly');
  });

  describe('Autosave ON - Editor Undo', () => {
    it('should use CodeMirror history when autosave is ON (source view)');
    it('should use Milkdown history when autosave is ON (wysiwyg view)');
    it('should not interfere with file-level history');
  });

  describe('Mode Switching', () => {
    it('should switch from editor undo to file undo when autosave disabled');
    it('should switch from file undo to editor undo when autosave enabled');
    it('should preserve document state during mode switch');
  });

  describe('Boundary Conditions', () => {
    it('should handle undo at earliest snapshot');
    it('should handle redo at latest snapshot');
    it('should handle empty history');
  });
});
```

**Implementation:**
- Modify `src/editors/source-view.js` to conditionally include history extension
- Modify `src/editors/wysiwyg-view.js` to conditionally include history plugin
- Add keyboard shortcut interception in `app.js`

### Phase 6: Autosave Toggle Integration (Unit Tests)

**Test File:** `tests/unit/autosave-integration.test.js`

```javascript
describe('Autosave Toggle Integration', () => {
  describe('Disabling Autosave', () => {
    it('should start history snapshot timer');
    it('should enable change highlighting in CodeMirror');
    it('should enable change highlighting in Milkdown');
    it('should switch to file-level undo');
    it('should create initial snapshot');
  });

  describe('Enabling Autosave', () => {
    it('should stop history snapshot timer');
    it('should clear all file histories');
    it('should disable change highlighting in CodeMirror');
    it('should disable change highlighting in Milkdown');
    it('should switch to editor-level undo');
    it('should remove all highlights from editors');
  });

  describe('Snapshot Timer', () => {
    it('should create snapshots every 5 seconds');
    it('should only create snapshot if content changed');
    it('should include cursor and scroll in snapshot');
  });
});
```

**Implementation:** Update `app.js` autosave checkbox event handler

### Phase 7: Toaster & File Operations (Unit Tests)

**Test File:** `tests/unit/toaster.test.js`

```javascript
describe('Toaster Notification', () => {
  it('should show toaster when opening file with unsaved changes');
  it('should not show toaster when opening file without unsaved changes');
  it('should not show toaster when autosave is ON');
  it('should be dismissable');
  it('should have correct message text');
});
```

**Test File:** `tests/unit/file-operations.test.js`

```javascript
describe('File Operations with History', () => {
  describe('Opening Files', () => {
    it('should check for unsaved changes when opening file');
    it('should trigger toaster if unsaved changes exist');
    it('should restore latest snapshot when opening file');
  });

  describe('Switching Files', () => {
    it('should create snapshot before switching files');
    it('should restore history when returning to previous file');
    it('should maintain separate histories for each file');
  });

  describe('Saving Files', () => {
    it('should not clear history when saving (autosave OFF)');
    it('should update originalContent after save');
  });
});
```

**Implementation:**
- Create toaster UI component (or use existing if available)
- Update file open/switch logic in `app.js`

### Phase 8: Integration Tests

**Test File:** `tests/integration/change-tracking.test.js`

```javascript
describe('Change Tracking - Integration', () => {
  it('should complete full workflow: disable autosave → edit → undo → redo → enable autosave');
  it('should persist history across app restarts');
  it('should handle switching between files with unsaved changes');
  it('should correctly highlight changes in both editor modes');
  it('should switch between source and wysiwyg while preserving changes');
  it('should handle external file modifications with active history');
  it('should maintain cursor/scroll position through undo/redo');
  it('should create snapshots at correct intervals');
  it('should clear highlights when autosave re-enabled');
});
```

### Phase 9: E2E Tests

**Test File:** `tests/e2e/change-tracking.e2e.js`

```javascript
describe('Change Tracking - E2E', () => {
  it('should disable autosave, make edits, and see highlights');
  it('should undo changes using Cmd+Z and see content revert');
  it('should redo changes using Cmd+Shift+Z');
  it('should switch files and see toaster about unsaved changes');
  it('should re-enable autosave and see highlights clear');
  it('should handle full editing session with multiple files');
  it('should persist changes and history across page reloads');

  describe('Edge Cases', () => {
    it('should handle rapid edits (stress test)');
    it('should handle very long documents (10000+ lines)');
    it('should handle switching between wysiwyg and source modes');
    it('should handle external file changes while history is active');
  });
});
```

## User Interface Changes

### 1. Autosave Checkbox
- Existing checkbox in `index.html` (lines 85-88)
- No changes to UI, only behavior changes

### 2. Change Highlighting
- Visual: Yellow/amber background color on changed text
- Opacity: 30% to not interfere with syntax highlighting
- Applied to: Both CodeMirror and Milkdown editors
- Color constant: `rgba(255, 213, 79, 0.3)`

### 3. Toaster Notification
- Position: Top-right or bottom-right of viewport
- Duration: Persistent (user must dismiss)
- Message: "This file has unsaved changes"
- Button: "Dismiss" or close icon
- Styling: Consistent with hotnote's existing UI theme

### 4. Optional: History Navigation UI
- Could add visual timeline slider (future enhancement)
- Could add "Undo" / "Redo" buttons in toolbar (future enhancement)
- Current implementation: Keyboard shortcuts only

## Technical Considerations

### Performance

1. **Snapshot Size**
   - Each snapshot stores full document content
   - For large documents (>1MB), could impact memory
   - Mitigation: Consider diffing approach in future (store deltas instead of full content)

2. **Snapshot Interval**
   - 5 seconds is balance between granularity and performance
   - Too frequent: excessive storage and processing
   - Too infrequent: coarse-grained undo (lose more work)

3. **Change Detection**
   - Diff algorithm runs on every content change
   - For very long documents, could be slow
   - Mitigation: Debounce decoration updates, use efficient diff algorithm

### Storage

1. **Session Properties File Size**
   - Unlimited history could lead to very large `.session_properties.HN` files
   - Multiple files with extensive histories could exceed reasonable limits
   - Mitigation: Monitor and potentially add soft limits in future

2. **Serialization**
   - JSON serialization/deserialization on every session save/load
   - Large histories could slow down save/load operations
   - Mitigation: Use incremental saves, only save changed histories

### Compatibility

1. **Backward Compatibility**
   - Existing `.session_properties.HN` files don't have `fileHistory` property
   - Must handle gracefully (treat as empty history)
   - Version field in session properties helps with migrations

2. **Editor Updates**
   - CodeMirror and Milkdown updates could break extensions
   - Pin versions or test thoroughly on updates

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock dependencies (file system, session storage, etc.)
- Focus on logic correctness
- Target: 90%+ code coverage

### Integration Tests
- Test interaction between components
- Use real session file storage (in test directory)
- Test full workflows end-to-end within code
- Target: All critical paths covered

### E2E Tests
- Test from user perspective using Playwright
- Simulate real user interactions (click, type, keyboard shortcuts)
- Test across different scenarios and edge cases
- Target: All user-facing features work correctly

## Implementation Checklist

- [ ] Phase 1: History Manager unit tests + implementation
- [ ] Phase 2: Session properties extension tests + implementation
- [ ] Phase 3: CodeMirror change highlighting tests + implementation
- [ ] Phase 4: Milkdown change highlighting tests + implementation
- [ ] Phase 5: Editor undo replacement tests + implementation
- [ ] Phase 6: Autosave toggle integration tests + implementation
- [ ] Phase 7: Toaster & file operations tests + implementation
- [ ] Phase 8: Integration tests
- [ ] Phase 9: E2E tests
- [ ] Documentation updates (README, user guide)
- [ ] Code review and refinement
- [ ] Manual QA testing
- [ ] Release

## Future Enhancements

1. **Visual History Timeline**
   - Add UI slider to navigate through snapshots visually
   - Show timestamps for each snapshot
   - Preview changes at each snapshot

2. **Delta-Based Snapshots**
   - Store only differences between snapshots (like git)
   - Reduce storage size significantly
   - Slightly more complex implementation

3. **Configurable Snapshot Interval**
   - Allow users to set snapshot frequency (5s, 10s, 30s, etc.)
   - Settings UI in hotnote

4. **Named Checkpoints**
   - Allow users to manually create named snapshots
   - "Save checkpoint" button
   - Show named checkpoints in history timeline

5. **Export/Import History**
   - Export history as patch file
   - Import history from another session
   - Share editing history with collaborators

6. **Diff View**
   - Side-by-side diff view between snapshots
   - Git-style diff with additions (green) and deletions (red)
   - More detailed than inline highlighting

## References

### Related Files
- `/Users/jamartin/work/claude/hotnote/src/editor/autosave.js` - Autosave manager
- `/Users/jamartin/work/claude/hotnote/src/editors/source-view.js` - CodeMirror editor
- `/Users/jamartin/work/claude/hotnote/src/editors/wysiwyg-view.js` - Milkdown editor
- `/Users/jamartin/work/claude/hotnote/src/storage/session-manager.js` - Session persistence
- `/Users/jamartin/work/claude/hotnote/src/state/app-state.js` - Application state
- `/Users/jamartin/work/claude/hotnote/app.js` - Main application logic

### External Documentation
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)
- [Milkdown Documentation](https://milkdown.dev/)
- [ProseMirror Documentation](https://prosemirror.net/docs/)
- [Diff Algorithms](https://en.wikipedia.org/wiki/Diff)

---

**Last Updated:** 2025-11-14
**Version:** 1.0
**Status:** Planning Complete, Ready for Implementation
