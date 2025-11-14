import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EditorManager } from '../src/editors/editor-manager.js';

// Mock the view classes
vi.mock('../src/editors/source-view.js', () => ({
  SourceView: class {
    constructor(container, content, onChange) {
      this.container = container;
      this.content = content;
      this.onChange = onChange;
    }
    getContent() {
      return this.content;
    }
    getCursor() {
      return { line: 0, column: 0 };
    }
    getAbsoluteCursor() {
      return 0;
    }
    getScrollPosition() {
      return 0;
    }
    setCursor() {}
    setAbsoluteCursor() {}
    setScrollPosition() {}
    focus() {}
    destroy() {}
    isActive() {
      return true;
    }
    getSelection() {
      return { from: 10, to: 20, text: 'selected' };
    }
    getDocumentText() {
      return this.content;
    }
    replaceSelection(text) {
      this.content = this.content.substring(0, 10) + text + this.content.substring(20);
      return true;
    }
    replaceRange(from, to, text) {
      this.content = this.content.substring(0, from) + text + this.content.substring(to);
      return true;
    }
  },
}));

vi.mock('../src/editors/wysiwyg-view.js', () => ({
  WYSIWYGView: class {
    constructor(container, content, onChange) {
      this.container = container;
      this.content = content;
      this.onChange = onChange;
    }
    ready() {
      return Promise.resolve();
    }
    getContent() {
      return this.content;
    }
    getCursor() {
      return { line: 5, column: 10 };
    }
    getAbsoluteCursor() {
      return 50;
    }
    getScrollPosition() {
      return 100;
    }
    setCursor() {}
    setAbsoluteCursor() {}
    setScrollPosition() {}
    focus() {}
    destroy() {}
    isActive() {
      return true;
    }
    getHeadings() {
      return [];
    }
    scrollToPosition() {}
    getSelection() {
      return { from: 5, to: 15, text: 'wysiwyg text' };
    }
    getDocumentText() {
      return this.content;
    }
    replaceSelection(text) {
      this.content = this.content.substring(0, 5) + text + this.content.substring(15);
      return true;
    }
    replaceRange(from, to, text) {
      this.content = this.content.substring(0, from) + text + this.content.substring(to);
      return true;
    }
  },
}));

describe('EditorManager', () => {
  let container;
  let onChange;

  beforeEach(() => {
    container = document.createElement('div');
    onChange = vi.fn();
  });

  describe('Initialization', () => {
    it('should initialize in wysiwyg mode by default', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'test content', onChange);
      await manager.ready();

      expect(manager.getMode()).toBe('wysiwyg');
      expect(manager.getContent()).toBe('test content');
    });

    it('should initialize in source mode when specified', async () => {
      const manager = new EditorManager(container, 'source', 'test content', onChange);
      await manager.ready();

      expect(manager.getMode()).toBe('source');
      expect(manager.getContent()).toBe('test content');
    });

    it('should call onChange callback', async () => {
      const manager = new EditorManager(container, 'source', 'test', onChange);
      await manager.ready();

      expect(manager.onChangeCallback).toBe(onChange);
    });
  });

  describe('Mode Switching', () => {
    it('should switch from wysiwyg to source', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'content', onChange);
      await manager.ready();

      await manager.switchMode('source');
      expect(manager.getMode()).toBe('source');
    });

    it('should switch from source to wysiwyg', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      await manager.switchMode('wysiwyg');
      expect(manager.getMode()).toBe('wysiwyg');
    });

    it('should not switch if already in target mode', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const currentEditor = manager.currentEditor;
      await manager.switchMode('source');

      expect(manager.currentEditor).toBe(currentEditor);
    });

    it('should preserve content when switching modes', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'test content', onChange);
      await manager.ready();

      await manager.switchMode('source');
      expect(manager.getContent()).toBe('test content');
    });

    it('should toggle between modes', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'content', onChange);
      await manager.ready();

      await manager.toggleMode();
      expect(manager.getMode()).toBe('source');

      await manager.toggleMode();
      expect(manager.getMode()).toBe('wysiwyg');
    });
  });

  describe('State Management', () => {
    it('should get cursor position', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'content', onChange);
      await manager.ready();

      const cursor = manager.getCursor();
      expect(cursor).toEqual({ line: 5, column: 10 });
    });

    it('should get scroll position', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'content', onChange);
      await manager.ready();

      const scroll = manager.getScrollPosition();
      expect(scroll).toBe(100);
    });

    it('should set cursor position', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'setCursor');
      manager.setCursor(10, 20);
      expect(spy).toHaveBeenCalledWith(10, 20);
    });

    it('should set scroll position', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'setScrollPosition');
      manager.setScrollPosition(200);
      expect(spy).toHaveBeenCalledWith(200);
    });

    it('should focus editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'focus');
      manager.focus();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should destroy editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'destroy');
      manager.destroy();

      expect(spy).toHaveBeenCalled();
      expect(manager.currentEditor).toBeNull();
    });

    it('should check if active', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      expect(manager.isActive()).toBe(true);

      manager.destroy();
      expect(manager.isActive()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle getCursor with no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      expect(manager.getCursor()).toEqual({ line: 0, column: 0 });
    });

    it('should handle getScrollPosition with no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      expect(manager.getScrollPosition()).toBe(0);
    });

    it('should handle getContent with no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      expect(manager.getContent()).toBe('');
    });

    it('should handle setCursor with no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      expect(() => manager.setCursor(0, 0)).not.toThrow();
    });

    it('should handle setScrollPosition with no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      expect(() => manager.setScrollPosition(0)).not.toThrow();
    });

    it('should handle focus with no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      expect(() => manager.focus()).not.toThrow();
    });
  });

  describe('Selection API', () => {
    it('should get selection from source mode', async () => {
      const manager = new EditorManager(container, 'source', 'test content', onChange);
      await manager.ready();

      const selection = manager.getSelection();

      expect(selection).toEqual({ from: 10, to: 20, text: 'selected' });
    });

    it('should get selection from wysiwyg mode', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'test content', onChange);
      await manager.ready();

      const selection = manager.getSelection();

      expect(selection).toEqual({ from: 5, to: 15, text: 'wysiwyg text' });
    });

    it('should return null selection when no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      const selection = manager.getSelection();

      expect(selection).toBeNull();
    });

    it('should get document text from source mode', async () => {
      const manager = new EditorManager(container, 'source', 'full document text', onChange);
      await manager.ready();

      const text = manager.getDocumentText();

      expect(text).toBe('full document text');
    });

    it('should get document text from wysiwyg mode', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'wysiwyg document', onChange);
      await manager.ready();

      const text = manager.getDocumentText();

      expect(text).toBe('wysiwyg document');
    });

    it('should return empty string for document text when no editor', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      const text = manager.getDocumentText();

      expect(text).toBe('');
    });

    it('should call underlying editor getSelection', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'getSelection');
      manager.getSelection();

      expect(spy).toHaveBeenCalled();
    });

    it('should call underlying editor getDocumentText', async () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'getDocumentText');
      manager.getDocumentText();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Text replacement', () => {
    it('should replace text at specific positions using replaceRange', async () => {
      const manager = new EditorManager(
        container,
        'source',
        'hello world, this is a test',
        onChange
      );
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'replaceRange');
      const result = manager.replaceRange(0, 5, 'goodbye');

      expect(spy).toHaveBeenCalledWith(0, 5, 'goodbye');
      expect(result).toBe(true);
      expect(manager.currentEditor.content).toBe('goodbye world, this is a test');
    });

    it('should replace text in middle of document', async () => {
      const manager = new EditorManager(
        container,
        'source',
        'hello world, this is a test',
        onChange
      );
      await manager.ready();

      manager.replaceRange(6, 11, 'everyone');

      expect(manager.currentEditor.content).toBe('hello everyone, this is a test');
    });

    it('should handle empty replacement text', async () => {
      const manager = new EditorManager(
        container,
        'source',
        'hello world, this is a test',
        onChange
      );
      await manager.ready();

      manager.replaceRange(5, 11, '');

      expect(manager.currentEditor.content).toBe('hello, this is a test');
    });

    it('should preserve text outside replacement range', async () => {
      const manager = new EditorManager(container, 'source', 'The quick brown fox', onChange);
      await manager.ready();

      manager.replaceRange(4, 9, 'slow');

      expect(manager.currentEditor.content).toBe('The slow brown fox');
    });

    it('should return false when no editor available', () => {
      const manager = new EditorManager(container, 'source', 'content', onChange);
      manager.currentEditor = null;

      const result = manager.replaceRange(0, 5, 'text');

      expect(result).toBe(false);
    });

    it('should work with WYSIWYG editor', async () => {
      const manager = new EditorManager(container, 'wysiwyg', 'original text here', onChange);
      await manager.ready();

      const spy = vi.spyOn(manager.currentEditor, 'replaceRange');
      manager.replaceRange(0, 8, 'modified');

      expect(spy).toHaveBeenCalledWith(0, 8, 'modified');
      expect(manager.currentEditor.content).toBe('modified text here');
    });

    it('should handle AI improvement workflow - replace selected text', async () => {
      const manager = new EditorManager(
        container,
        'source',
        'This is some text that needs improvement.',
        onChange
      );
      await manager.ready();

      // Simulate AI improvement: select "some text" (8-17) and improve it
      const from = 8;
      const to = 17;
      const improvedText = 'excellent content';

      manager.replaceRange(from, to, improvedText);

      expect(manager.currentEditor.content).toBe(
        'This is excellent content that needs improvement.'
      );
    });

    it('should handle AI improvement with comments - only replace text portion', async () => {
      const manager = new EditorManager(
        container,
        'source',
        'This sentence is verbose. // make it concise',
        onChange
      );
      await manager.ready();

      // Simulate: selected text is "This sentence is verbose. // make it concise"
      // After comment extraction, AI returns just the improved text without comment
      const from = 0;
      const to = 47; // Full length including comment
      const improvedText = 'This is concise.';

      manager.replaceRange(from, to, improvedText);

      expect(manager.currentEditor.content).toBe('This is concise.');
    });
  });
});
