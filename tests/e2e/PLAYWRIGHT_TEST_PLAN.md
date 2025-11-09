# Playwright E2E Test Plan for Hotnote

## Overview

This document outlines the critical end-to-end test scenarios for Hotnote using Playwright. These tests verify the complete user workflows and ensure the app works correctly in real browser environments.

## Test Environment Setup

```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Critical Test Scenarios

### 1. PWA Installation and Offline Support

**Priority: P0 (Critical)**

#### Test: PWA Installation

```javascript
test('should install as PWA on desktop', async ({ page, context }) => {
  await page.goto('/');

  // Wait for service worker registration
  await page.waitForFunction(() => 'serviceWorker' in navigator);

  // Check manifest link
  const manifestLink = await page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

  // Verify manifest content
  const manifestResponse = await page.request.get('/manifest.json');
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('hotnote');
  expect(manifest.display).toBe('standalone');
});
```

#### Test: Service Worker Caching

```javascript
test('should cache assets for offline use', async ({ page }) => {
  await page.goto('/');

  // Wait for service worker to activate
  const swRegistration = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active.state;
  });
  expect(swRegistration).toBe('activated');

  // Go offline
  await page.context().setOffline(true);

  // Reload page - should load from cache
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
});
```

#### Test: Offline File Editing

```javascript
test('should allow editing files while offline', async ({ page }) => {
  await page.goto('/');

  // Create a file online
  await page.keyboard.type('# Test Document\nSome content');

  // Go offline
  await page.context().setOffline(true);

  // Continue editing
  await page.keyboard.press('End');
  await page.keyboard.type('\nMore offline content');

  // Content should be updated
  const content = await page.evaluate(() => window.editorView.state.doc.toString());
  expect(content).toContain('More offline content');
});
```

### 2. File System Access API Integration

**Priority: P0 (Critical)**

#### Test: Open Directory

```javascript
test('should open directory and list files', async ({ page }) => {
  await page.goto('/');

  // Mock directory picker (requires custom CDP commands in Chromium)
  const mockDirHandle = await page.evaluateHandle(() => {
    // Create mock directory structure
    return createMockDirectory({
      src: {
        'app.js': 'console.log("app");',
        'utils.js': 'export const util = () => {};',
      },
      'README.md': '# Project',
    });
  });

  // Open directory
  await page.click('[data-testid="open-folder-btn"]');

  // Verify file list appears
  await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
  await expect(page.locator('text=app.js')).toBeVisible();
  await expect(page.locator('text=README.md')).toBeVisible();
});
```

#### Test: Session File in Root Only

```javascript
test('should create session file only in root directory', async ({ page }) => {
  await page.goto('/');

  // Open folder
  await page.click('[data-testid="open-folder-btn"]');

  // Navigate to subdirectory
  await page.click('text=src');

  // Open file in subdirectory
  await page.click('text=app.js');

  // Verify session file location
  const sessionFileLocation = await page.evaluate(async () => {
    const rootHandle = window.rootDirHandle;
    try {
      await rootHandle.getFileHandle('.session_properties.HN');
      return 'root';
    } catch {
      return 'not-found';
    }
  });

  expect(sessionFileLocation).toBe('root');

  // Verify session file NOT in subdirectory
  const subdirSession = await page.evaluate(async () => {
    const currentHandle = window.currentDirHandle;
    try {
      await currentHandle.getFileHandle('.session_properties.HN');
      return 'found';
    } catch {
      return 'not-found';
    }
  });

  expect(subdirSession).toBe('not-found');
});
```

### 3. Editor Functionality

**Priority: P0 (Critical)**

#### Test: Code Editing with Syntax Highlighting

```javascript
test('should provide syntax highlighting for JavaScript', async ({ page }) => {
  await page.goto('/');

  // Type JavaScript code
  await page.keyboard.type('const greeting = "Hello World";');

  // Verify syntax highlighting applied
  const hasHighlighting = await page.evaluate(() => {
    const tokens = document.querySelectorAll('.cm-keyword, .cm-string');
    return tokens.length > 0;
  });

  expect(hasHighlighting).toBe(true);
});
```

#### Test: Auto-save Functionality

```javascript
test('should auto-save changes after delay', async ({ page }) => {
  await page.goto('/');

  // Open a file
  await page.click('[data-testid="open-folder-btn"]');
  await page.click('text=README.md');

  // Make changes
  await page.keyboard.type('\nNew content');

  // Wait for auto-save (2 seconds)
  await page.waitForTimeout(2500);

  // Verify file was saved (check dirty state indicator)
  const isDirty = await page.evaluate(() => window.isDirty);
  expect(isDirty).toBe(false);
});
```

### 4. Search and Navigation

**Priority: P1 (High)**

#### Test: Fuzzy File Search

```javascript
test('should search files with fuzzy matching', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="open-folder-btn"]');

  // Open search with /
  await page.keyboard.press('/');

  // Type fuzzy query
  await page.keyboard.type('apjs');

  // Should match "app.js"
  await expect(page.locator('[data-testid="search-result"]').first()).toContainText('app.js');

  // Press Enter to open
  await page.keyboard.press('Enter');

  // Verify file opened
  await expect(page.locator('[data-testid="current-file"]')).toContainText('app.js');
});
```

#### Test: Progressive Search Results

```javascript
test('should show progressive search results', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="open-folder-btn"]');

  await page.keyboard.press('/');

  // Type progressively
  await page.keyboard.type('a');
  let results = await page.locator('[data-testid="search-result"]').count();
  expect(results).toBeGreaterThan(0);

  await page.keyboard.type('pp');
  results = await page.locator('[data-testid="search-result"]').count();

  // Results should be filtered
  const firstResult = await page.locator('[data-testid="search-result"]').first().textContent();
  expect(firstResult).toMatch(/app/i);
});
```

### 5. Markdown Editor

**Priority: P1 (High)**

#### Test: Toggle Rich Markdown Mode

```javascript
test('should toggle between code and rich markdown mode', async ({ page }) => {
  await page.goto('/');

  // Create markdown content
  await page.keyboard.type('# Heading\n\n**Bold text**');

  // Toggle rich mode (Ctrl+Shift+P)
  await page.keyboard.press('Control+Shift+P');

  // Verify rich editor is active
  const isRichMode = await page.evaluate(() => window.isRichMode);
  expect(isRichMode).toBe(true);

  // Verify rendered markdown
  await expect(page.locator('.milkdown h1')).toContainText('Heading');
  await expect(page.locator('.milkdown strong')).toContainText('Bold text');

  // Toggle back
  await page.keyboard.press('Control+Shift+P');
  expect(await page.evaluate(() => window.isRichMode)).toBe(false);
});
```

### 6. Session Persistence

**Priority: P0 (Critical)**

#### Test: Restore Session After Refresh

```javascript
test('should restore last open file after refresh', async ({ page }) => {
  await page.goto('/');

  // Open folder and file
  await page.click('[data-testid="open-folder-btn"]');
  await page.click('text=README.md');

  // Modify content
  await page.keyboard.type('\nTest content for session');

  // Wait for session save
  await page.waitForTimeout(2500);

  // Refresh page
  await page.reload();

  // Re-open same folder (in real scenario, would be restored automatically)
  await page.click('[data-testid="open-folder-btn"]');

  // Verify file and content restored
  await expect(page.locator('[data-testid="current-file"]')).toContainText('README.md');
  const content = await page.evaluate(() => window.editorView.state.doc.toString());
  expect(content).toContain('Test content for session');
});
```

#### Test: Restore Cursor Position

```javascript
test('should restore cursor position from session', async ({ page }) => {
  await page.goto('/');

  // Open file
  await page.click('[data-testid="open-folder-btn"]');
  await page.click('text=README.md');

  // Position cursor
  await page.keyboard.press('End');
  const initialPosition = await page.evaluate(() => {
    return window.editorView.state.selection.main.head;
  });

  // Refresh
  await page.reload();
  await page.click('[data-testid="open-folder-btn"]');

  // Verify cursor restored
  const restoredPosition = await page.evaluate(() => {
    return window.editorView.state.selection.main.head;
  });

  expect(restoredPosition).toBe(initialPosition);
});
```

### 7. Keyboard Shortcuts

**Priority: P1 (High)**

#### Test: Essential Shortcuts

```javascript
test('should handle all keyboard shortcuts', async ({ page }) => {
  await page.goto('/');

  // Test Ctrl+S (save)
  await page.keyboard.press('Control+S');
  // Should not throw error even with no file

  // Test Ctrl+O (open file)
  await page.keyboard.press('Control+O');
  await expect(page.locator('[data-testid="file-picker"]')).toBeVisible();

  // Test Ctrl+N (new file)
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+N');
  const content = await page.evaluate(() => window.editorView.state.doc.toString());
  expect(content).toBe('');

  // Test / (search)
  await page.keyboard.press('/');
  await expect(page.locator('[data-testid="search-input"]')).toBeFocused();
});
```

### 8. Undo/Redo with File Changes

**Priority: P1 (High)**

#### Test: Undo Across File Navigation

```javascript
test('should handle undo after switching files', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="open-folder-btn"]');

  // Open file 1 and edit
  await page.click('text=file1.txt');
  await page.keyboard.type('Content in file 1');

  // Open file 2 and edit
  await page.click('text=file2.txt');
  await page.keyboard.type('Content in file 2');

  // Undo should affect file 2
  await page.keyboard.press('Control+Z');
  const content = await page.evaluate(() => window.editorView.state.doc.toString());
  expect(content).toBe('');

  // Navigate back to file 1
  await page.click('text=file1.txt');

  // Content should still be there
  const file1Content = await page.evaluate(() => window.editorView.state.doc.toString());
  expect(file1Content).toContain('Content in file 1');
});
```

## Performance Tests

**Priority: P2 (Medium)**

### Test: Large File Handling

```javascript
test('should handle large files efficiently', async ({ page }) => {
  await page.goto('/');

  // Create large file (100,000 lines)
  const largeContent = 'Line of text\\n'.repeat(100000);

  await page.evaluate((content) => {
    window.editorView.dispatch({
      changes: { from: 0, insert: content },
    });
  }, largeContent);

  // Measure render time
  const startTime = Date.now();
  await page.keyboard.press('End');
  const endTime = Date.now();

  expect(endTime - startTime).toBeLessThan(500); // Should be responsive
});
```

### Test: Directory with Many Files

```javascript
test('should handle directory with 1000+ files', async ({ page }) => {
  await page.goto('/');

  // Mock directory with 1000 files
  const mockHandle = await page.evaluateHandle(() => {
    const files = {};
    for (let i = 0; i < 1000; i++) {
      files[`file${i}.txt`] = `Content ${i}`;
    }
    return createMockDirectory(files);
  });

  await page.click('[data-testid="open-folder-btn"]');

  // Search should still be fast
  await page.keyboard.press('/');
  const searchStart = Date.now();
  await page.keyboard.type('500');
  await expect(page.locator('[data-testid="search-result"]').first()).toBeVisible();
  const searchEnd = Date.now();

  expect(searchEnd - searchStart).toBeLessThan(200);
});
```

## Accessibility Tests

**Priority: P2 (Medium)**

### Test: Keyboard Navigation

```javascript
test('should be fully keyboard navigable', async ({ page }) => {
  await page.goto('/');

  // Tab through all interactive elements
  await page.keyboard.press('Tab');
  let focused = await page.evaluate(() => document.activeElement.id);
  expect(focused).toBeTruthy();

  // Continue tabbing
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
  }

  // Should never lose focus
  focused = await page.evaluate(() => document.activeElement);
  expect(focused).not.toBeNull();
});
```

### Test: Screen Reader Support

```javascript
test('should have proper ARIA labels', async ({ page }) => {
  await page.goto('/');

  // Check main regions
  const mainRegion = await page.locator('[role="main"]');
  await expect(mainRegion).toBeVisible();

  // Check buttons have labels
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const label = (await button.getAttribute('aria-label')) || (await button.textContent());
    expect(label).toBeTruthy();
  }
});
```

## Test Execution Strategy

### Priority Levels

- **P0 (Critical)**: Must pass before every release
- **P1 (High)**: Should pass, blockers for minor releases
- **P2 (Medium)**: Nice to have, can be fixed in patches
- **P3 (Low)**: Enhancements, addressed in future versions

### CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Data Management

### Mock Directory Structures

```javascript
// tests/e2e/fixtures/mock-directories.js
export const smallProject = {
  src: {
    'app.js': 'console.log("app");',
    'utils.js': 'export const util = () => {};',
  },
  tests: {
    'app.test.js': 'test("app", () => {});',
  },
  'README.md': '# Project',
};

export const largeProject = {
  // Generate programmatically
};
```

## Notes

- All tests should clean up after themselves
- Use page.waitForLoadState('networkidle') for stable tests
- Mock File System Access API where needed
- Test in incognito mode to avoid cache issues
- Use data-testid attributes for stable selectors
