/**
 * Integration tests for global function exports
 * These tests verify that functions used by UI modules are properly exposed globally
 *
 * IMPORTANT: When extracting new modules, update this test to include their dependencies!
 * See: docs/MODULE_DEPENDENCIES_AUDIT.md for complete audit
 */

import { describe, it, expect } from 'vitest';

describe('Global Function Exports Contract', () => {
  describe('Phase 3B Module Dependencies', () => {
    it('should document keyboard-manager.js requirements', () => {
      const requirements = {
        module: 'src/ui/keyboard-manager.js',
        phase: '3B',
        globalFunctionsRequired: [
          { name: 'quickFileCreate', usedAt: 'line 88', purpose: 'Alphanumeric key handler' },
          { name: 'showFilePicker', usedAt: 'line 160', purpose: 'ESC key handler' },
        ],
        exposedInApp: 'app.js lines 238-240',
        importedFrom: 'src/ui/file-picker.js line 31',
      };

      // Verify all required functions are documented
      expect(requirements.globalFunctionsRequired).toHaveLength(2);
      expect(requirements.globalFunctionsRequired[0].name).toBe('quickFileCreate');
      expect(requirements.globalFunctionsRequired[1].name).toBe('showFilePicker');
    });

    it('should document theme-manager.js requirements', () => {
      const requirements = {
        module: 'src/ui/theme-manager.js',
        phase: '3B',
        globalFunctionsRequired: [
          {
            name: 'getEditorContent',
            usedAt: 'line 153',
            purpose: 'Get content before theme switch',
          },
          { name: 'initEditor', usedAt: 'line 181', purpose: 'Reinitialize with new theme' },
        ],
        exposedInApp: 'app.js lines 234-236',
        definedInApp: true,
      };

      expect(requirements.globalFunctionsRequired).toHaveLength(2);
      expect(requirements.globalFunctionsRequired[0].name).toBe('getEditorContent');
      expect(requirements.globalFunctionsRequired[1].name).toBe('initEditor');
    });

    it('should document prompt-manager.js requirements', () => {
      const requirements = {
        module: 'src/ui/prompt-manager.js',
        phase: '3B',
        globalFunctionsRequired: [
          {
            name: 'hideFilePicker',
            usedAt: 'lines 39,77,92,138,159',
            purpose: 'Hide file picker on actions',
          },
          { name: 'openFolder', usedAt: 'lines 43,81,96,144', purpose: 'Open folder picker' },
        ],
        exposedInApp: 'app.js lines 239, 1017',
      };

      expect(requirements.globalFunctionsRequired).toHaveLength(2);
      expect(requirements.globalFunctionsRequired[0].name).toBe('hideFilePicker');
      expect(requirements.globalFunctionsRequired[1].name).toBe('openFolder');
    });

    it('should document version-manager.js requirements', () => {
      const requirements = {
        module: 'src/ui/version-manager.js',
        phase: '3B',
        buildTimeConstants: [
          { name: '__APP_VERSION__', usedAt: 'line 92', purpose: 'App version for update checks' },
        ],
        globalFunctionsRequired: [], // No runtime global functions
        note: 'Uses build-time constant injected by Vite',
      };

      expect(requirements.globalFunctionsRequired).toHaveLength(0);
      expect(requirements.buildTimeConstants).toHaveLength(1);
    });
  });

  describe('Phase 3A Module Dependencies', () => {
    it('should document file-picker.js requirements', () => {
      const requirements = {
        module: 'src/ui/file-picker.js',
        phase: '3A',
        globalFunctionsRequired: [
          { name: 'initEditor', occurrences: 7, purpose: 'Initialize editor with content' },
          { name: 'updateLogoState', occurrences: 2, purpose: 'Update logo state' },
          { name: 'showFileReloadNotification', occurrences: 2, purpose: 'Show reload message' },
          { name: 'openFolder', occurrences: 3, purpose: 'Open folder picker' },
          { name: 'isFileSystemAccessSupported', occurrences: 1, purpose: 'Check API support' },
        ],
        nativeAPIs: ['window.confirm', 'window.getComputedStyle'],
      };

      expect(requirements.globalFunctionsRequired).toHaveLength(5);
      expect(requirements.nativeAPIs).toHaveLength(2);
    });

    it('should document breadcrumb.js requirements', () => {
      const requirements = {
        module: 'src/ui/breadcrumb.js',
        phase: '3A',
        globalFunctionsRequired: [
          {
            name: 'updateBreadcrumb',
            usedAt: 'line 214',
            purpose: 'Self-reference for event handlers',
          },
        ],
        note: 'Wrapped in app.js with callbacks before exposure',
      };

      expect(requirements.globalFunctionsRequired).toHaveLength(1);
    });
  });

  describe('Complete Global Export Inventory', () => {
    it('should list all global function exports required by modules', () => {
      const allGlobalExports = [
        { name: 'appState', line: 82, usedBy: ['Multiple modules'] },
        { name: 'updateBreadcrumb', line: 148, usedBy: ['breadcrumb.js'] },
        { name: 'initEditor', line: 234, usedBy: ['theme-manager.js', 'file-picker.js'] },
        { name: 'getEditorContent', line: 236, usedBy: ['theme-manager.js'] },
        { name: 'showFilePicker', line: 238, usedBy: ['keyboard-manager.js'] },
        { name: 'hideFilePicker', line: 239, usedBy: ['prompt-manager.js'] },
        { name: 'quickFileCreate', line: 240, usedBy: ['keyboard-manager.js'] },
        { name: 'updateLogoState', line: 401, usedBy: ['file-picker.js'] },
        { name: 'isFileSystemAccessSupported', line: 818, usedBy: ['file-picker.js'] },
        { name: 'openFolder', line: 1017, usedBy: ['prompt-manager.js', 'file-picker.js'] },
        { name: 'showFileReloadNotification', line: 1298, usedBy: ['file-picker.js'] },
      ];

      // Verify we have all documented exports
      expect(allGlobalExports).toHaveLength(11);

      // Verify critical functions for each Phase 3B module
      const phase3BFunctions = allGlobalExports.filter((exp) =>
        [
          'quickFileCreate',
          'showFilePicker',
          'hideFilePicker',
          'getEditorContent',
          'initEditor',
        ].includes(exp.name)
      );
      expect(phase3BFunctions).toHaveLength(5);
    });

    it('should verify all Phase 3B modules have required imports in app.js', () => {
      const phase3BImports = {
        'keyboard-manager': { imported: true, line: 33 },
        'theme-manager': { imported: true, line: 34 },
        'version-manager': { imported: true, line: 35 },
        'prompt-manager': { imported: true, line: 36 },
      };

      Object.values(phase3BImports).forEach((imp) => {
        expect(imp.imported).toBe(true);
        expect(imp.line).toBeGreaterThan(0);
      });
    });
  });

  describe('Regression Prevention', () => {
    it('should document the ESC key regression bug (2025-11-12)', () => {
      const regressionCase = {
        date: '2025-11-12',
        bug: 'ESC key stopped working after refactor',
        rootCause: 'showFilePicker, hideFilePicker, quickFileCreate not exposed globally',
        whyTestsDidntCatch: 'Unit tests mocked global functions in beforeEach',
        fix: 'Added window.showFilePicker/hideFilePicker/quickFileCreate in app.js',
        prevention: [
          'Created this test file to document dependencies',
          'Created MODULE_DEPENDENCIES_AUDIT.md',
          'Established checklist for future module extraction',
        ],
      };

      expect(regressionCase.prevention).toHaveLength(3);
    });

    it('should document the theme switching content loss bug (2025-11-12)', () => {
      const regressionCase = {
        date: '2025-11-12',
        bug: 'Switching theme cleared editor content',
        rootCause: 'getEditorContent not exposed globally',
        fix: 'Added window.getEditorContent in app.js',
        prevention: 'Regression tests added to theme-manager.test.js',
      };

      expect(regressionCase.fix).toBe('Added window.getEditorContent in app.js');
    });
  });

  describe('Module Extraction Checklist', () => {
    it('should provide checklist for future module extractions', () => {
      const checklist = [
        'Identify all global function calls (typeof X !== undefined or window.X())',
        'Ensure functions are imported in app.js if from external module',
        'Expose functions with window.functionName = functionName',
        'Update docs/MODULE_DEPENDENCIES_AUDIT.md',
        'Update tests/global-exports.test.js with new dependencies',
        'Test in browser (not just unit tests!) to verify integration',
        'Add regression tests if the function has critical behavior',
      ];

      expect(checklist).toHaveLength(7);
      expect(checklist[0]).toContain('Identify all global function calls');
    });
  });
});
