# Module Dependencies Audit
**Phase 3A & 3B Refactoring - Global Function Dependencies**

This document audits all global function dependencies for UI modules extracted in Phase 3A and Phase 3B refactoring.

## ✅ Audit Status: COMPLETE - All dependencies properly wired

Last audited: 2025-11-12

---

## Phase 3B Modules (Newly Created)

### 1. keyboard-manager.js (`src/ui/keyboard-manager.js`)

**Global Functions Used:**
- ✅ `quickFileCreate` - Used by alphanumeric key handler (line 88)
- ✅ `showFilePicker` - Used by ESC key handler (line 160)

**Wiring:**
- Imported in app.js: line 31 (`from './src/ui/file-picker.js'`)
- Exposed globally: app.js line 238-240
  ```javascript
  window.showFilePicker = showFilePicker;
  window.quickFileCreate = quickFileCreate;
  ```

---

### 2. theme-manager.js (`src/ui/theme-manager.js`)

**Global Functions Used:**
- ✅ `getEditorContent` - Get editor content before theme switch (line 153)
- ✅ `initEditor` - Reinitialize editor with new theme (line 181)

**Wiring:**
- Defined in app.js: lines 128-135 (getEditorContent), 150+ (initEditor)
- Exposed globally: app.js lines 234-236
  ```javascript
  window.initEditor = initEditor;
  window.getEditorContent = getEditorContent;
  ```

---

### 3. prompt-manager.js (`src/ui/prompt-manager.js`)

**Global Functions Used:**
- ✅ `hideFilePicker` - Hide file picker (lines 39, 77, 92, 138, 159)
- ✅ `openFolder` - Open folder picker (lines 43, 81, 96, 144)

**Wiring:**
- Imported in app.js:
  - line 26 (`hideFilePicker` from './src/ui/file-picker.js')
  - openFolder defined in app.js line 969+
- Exposed globally:
  - app.js line 239 (hideFilePicker)
  - app.js line 1017 (openFolder)
  ```javascript
  window.hideFilePicker = hideFilePicker;
  window.openFolder = openFolder;
  ```

---

### 4. version-manager.js (`src/ui/version-manager.js`)

**Global Variables/Constants Used:**
- ✅ `__APP_VERSION__` - Build-time constant (line 92)

**Wiring:**
- Injected at build time by Vite (see vite.config.js)
- No explicit exposure needed (build-time replacement)

---

## Phase 3A Modules (Previously Created)

### 5. file-picker.js (`src/ui/file-picker.js`)

**Global Functions Used:**
- ✅ `initEditor` - Initialize editor with file content (lines 430, 872, 895, 1216, 1256, 1266)
- ✅ `updateLogoState` - Update logo state (lines 441, 1272)
- ✅ `showFileReloadNotification` - Show reload notification (lines 448, 1262)
- ✅ `openFolder` - Open folder picker (lines 858, 863, 886)
- ✅ `isFileSystemAccessSupported` - Check API support (line 1297)
- ✅ `window.confirm` - Native browser API (line 1314)
- ✅ `window.getComputedStyle` - Native browser API (line 1048)

**Wiring:**
- All custom functions properly exposed in app.js:
  - `initEditor`: line 234
  - `updateLogoState`: line 401
  - `showFileReloadNotification`: line 1298
  - `openFolder`: line 1017
  - `isFileSystemAccessSupported`: line 818
- Native APIs available globally

---

### 6. breadcrumb.js (`src/ui/breadcrumb.js`)

**Global Functions Used:**
- ✅ `updateBreadcrumb` - Self-reference for event handlers (line 214)

**Wiring:**
- Imported in app.js: line 15 (as `updateBreadcrumbCore`)
- Wrapped and exposed: app.js lines 138-147
  ```javascript
  const updateBreadcrumb = () => {
    updateBreadcrumbCore({ openFolder, showFilePicker, ... });
  };
  window.updateBreadcrumb = updateBreadcrumb;
  ```

---

## Global Function Exposure Summary

All functions are exposed in app.js. Here's the complete list:

| Function | Line | Used By Module(s) |
|----------|------|-------------------|
| `appState` | 82 | Multiple |
| `updateBreadcrumb` | 148 | breadcrumb.js |
| `initEditor` | 234 | theme-manager.js, file-picker.js |
| `getEditorContent` | 236 | theme-manager.js |
| `showFilePicker` | 238 | keyboard-manager.js |
| `hideFilePicker` | 239 | prompt-manager.js |
| `quickFileCreate` | 240 | keyboard-manager.js |
| `updateLogoState` | 401 | file-picker.js |
| `isFileSystemAccessSupported` | 818 | file-picker.js |
| `openFolder` | 1017 | prompt-manager.js, file-picker.js |
| `showFileReloadNotification` | 1298 | file-picker.js |

---

## Import Verification

### Phase 3B Modules - Imported in app.js:

```javascript
// Line 24-32: file-picker exports
import {
  showFilePicker,      // ✅ Exposed line 238
  hideFilePicker,      // ✅ Exposed line 239
  quickFileCreate,     // ✅ Exposed line 240
  // ... other exports
} from './src/ui/file-picker.js';

// Line 33: keyboard-manager
import { initKeyboardManager, updateEditorBlurState } from './src/ui/keyboard-manager.js';

// Line 34: theme-manager
import { initThemeManager, toggleTheme } from './src/ui/theme-manager.js';

// Line 35: version-manager
import { initVersionManager, performVersionCheck } from './src/ui/version-manager.js';

// Line 36: prompt-manager
import { showWelcomePrompt, showResumePrompt, showWorkdirPrompt } from './src/ui/prompt-manager.js';
```

---

## Testing Coverage

Integration test: `tests/global-exports.test.js` (7 tests)
- Documents all global function dependencies
- Serves as a checklist for future refactoring
- Validates the dependency contract

Unit tests verify modules work when globals are mocked (all passing).

---

## Regression Prevention

**Issue 1: Missing Global Function Exposures (2025-11-12)**
Discovered that `quickFileCreate`, `showFilePicker`, and `hideFilePicker` were not initially exposed after refactoring, causing ESC key and quick file creation to silently fail.

**Why Tests Didn't Catch It:**
Unit tests mocked the global functions in `beforeEach`, so they passed even though integration was broken.

**Issue 2: Autosave Checkbox Focus Loss (2025-11-12)**
Clicking the autosave checkbox blurred the editor and did not restore focus, unlike other UI controls (dark mode toggle, rich mode toggle).

**Root Cause:**
Autosave checkbox event handler did not follow the established pattern:
1. Save focus state before action
2. Perform action
3. Restore focus after action

**Fix Applied:**
Updated app.js lines 1357-1365 to match the pattern used by dark-mode-toggle and rich-toggle-btn:
```javascript
document.getElementById('autosave-checkbox').addEventListener('change', (e) => {
  appState.focusManager?.saveFocusState();
  autosaveManager.toggle(e.target.checked);
  animateAutosaveLabel(e.target.checked);
  setTimeout(() => {
    appState.focusManager?.focusEditor({ reason: 'autosave-toggle' });
  }, 0);
});
```

Also applied same fix to rich-toggle-btn (app.js lines 1366-1373).

**Prevention Measures:**
1. Created `tests/global-exports.test.js` to document dependencies
2. Created `tests/autosave-focus.test.js` to document focus restoration pattern
3. This audit document serves as reference
4. When adding new UI controls, follow the focus restoration pattern

---

## Checklist for Future Module Extraction

When extracting new modules that need global functions:

- [ ] Identify all global function calls (`typeof X !== 'undefined'` or `window.X()`)
- [ ] Ensure functions are imported in app.js
- [ ] Expose functions with `window.functionName = functionName`
- [ ] Update this audit document
- [ ] Update `tests/global-exports.test.js` with new dependencies
- [ ] Test in browser (not just unit tests!) to verify integration

---

## Status: ✅ ALL CLEAR

All modules have their dependencies properly wired. No missing global function exposures detected.
