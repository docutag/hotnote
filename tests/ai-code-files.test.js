import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  addCommentDecoration,
  removeCommentDecoration,
  commentDecorationField,
  commentClickHandler,
} from '../src/editors/source-view.js';

describe('AI Feature on Code Files (CodeMirror)', () => {
  let editorView;
  let container;

  beforeEach(() => {
    // Create a container element
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create a basic CodeMirror instance with decoration support
    const state = EditorState.create({
      doc: 'function test() {\n  return true;\n}',
      extensions: [commentDecorationField, commentClickHandler()],
    });

    editorView = new EditorView({
      state,
      parent: container,
    });

    // Add the methods that initCodeMirrorEditor adds
    editorView.getSelection = function () {
      if (!this.state) {
        return null;
      }

      const selection = this.state.selection.main;

      if (selection.from === selection.to) {
        return null;
      }

      const text = this.state.doc.sliceString(selection.from, selection.to);

      return {
        from: selection.from,
        to: selection.to,
        text: text,
      };
    };

    editorView.replaceSelection = function (text) {
      if (!this.state) {
        return false;
      }

      try {
        const selection = this.state.selection.main;

        this.dispatch({
          changes: { from: selection.from, to: selection.to, insert: text },
          selection: { anchor: selection.from + text.length },
        });

        return true;
      } catch (error) {
        console.error('[CodeMirror] Error replacing selection:', error);
        return false;
      }
    };

    editorView.replaceRange = function (from, to, text) {
      if (!this.state) {
        return false;
      }

      try {
        this.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });

        return true;
      } catch (error) {
        console.error('[CodeMirror] Error replacing range:', error);
        return false;
      }
    };

    // Add AI loading decoration methods that use the real decoration system
    editorView.addAILoadingDecoration = function (from, to) {
      if (!this.state) return;

      console.log('[CodeMirror] Adding AI loading decoration:', { from, to });

      this.dispatch({
        effects: addCommentDecoration.of({
          commentId: '__ai_loading__',
          from,
          to,
          isActive: true,
          cssClass: 'ai-loading-highlight',
        }),
      });

      console.log('[CodeMirror] AI loading decoration applied');
    };

    editorView.removeAILoadingDecoration = function () {
      console.log('[CodeMirror] Removing AI loading decoration');

      if (!this.state) return;

      this.dispatch({
        effects: removeCommentDecoration.of('__ai_loading__'),
      });
    };
  });

  afterEach(() => {
    if (editorView) {
      editorView.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Selection methods', () => {
    it('should have getSelection method', () => {
      expect(editorView.getSelection).toBeDefined();
      expect(typeof editorView.getSelection).toBe('function');
    });

    it('should return selection when text is selected', () => {
      // Manually set a selection
      editorView.dispatch({
        selection: { anchor: 0, head: 8 }, // Select "function"
      });

      const selection = editorView.getSelection();
      expect(selection).toBeTruthy();
      expect(selection.from).toBe(0);
      expect(selection.to).toBe(8);
      expect(selection.text).toBe('function');
    });

    it('should return null when no text is selected', () => {
      // Cursor at position 0 (no selection)
      editorView.dispatch({
        selection: { anchor: 0, head: 0 },
      });

      const selection = editorView.getSelection();
      expect(selection).toBeNull();
    });
  });

  describe('Text replacement methods', () => {
    it('should have replaceSelection method', () => {
      expect(editorView.replaceSelection).toBeDefined();
      expect(typeof editorView.replaceSelection).toBe('function');
    });

    it('should have replaceRange method', () => {
      expect(editorView.replaceRange).toBeDefined();
      expect(typeof editorView.replaceRange).toBe('function');
    });

    it('should replace selected text with replaceSelection', () => {
      // Select "function"
      editorView.dispatch({
        selection: { anchor: 0, head: 8 },
      });

      const success = editorView.replaceSelection('const');
      expect(success).toBe(true);

      const content = editorView.state.doc.toString();
      expect(content).toContain('const test()');
      expect(content).not.toContain('function test()');
    });

    it('should replace text at specific positions with replaceRange', () => {
      const success = editorView.replaceRange(0, 8, 'async function');
      expect(success).toBe(true);

      const content = editorView.state.doc.toString();
      expect(content).toContain('async function test()');
    });

    it('should update cursor position after replacement', () => {
      editorView.replaceRange(0, 8, 'const');

      const cursorPos = editorView.state.selection.main.anchor;
      expect(cursorPos).toBe(5); // Position after "const"
    });
  });

  describe('AI loading decoration methods', () => {
    it('should have addAILoadingDecoration method', () => {
      expect(editorView.addAILoadingDecoration).toBeDefined();
      expect(typeof editorView.addAILoadingDecoration).toBe('function');
    });

    it('should have removeAILoadingDecoration method', () => {
      expect(editorView.removeAILoadingDecoration).toBeDefined();
      expect(typeof editorView.removeAILoadingDecoration).toBe('function');
    });

    it('should call addAILoadingDecoration without errors', () => {
      expect(() => {
        editorView.addAILoadingDecoration(0, 8);
      }).not.toThrow();
    });

    it('should call removeAILoadingDecoration without errors', () => {
      expect(() => {
        editorView.removeAILoadingDecoration();
      }).not.toThrow();
    });

    it('should actually create decoration when adding AI loading', () => {
      // Add decoration
      editorView.addAILoadingDecoration(0, 8);

      // Get the decoration field state
      const decorationState = editorView.state.field(commentDecorationField);
      expect(decorationState).toBeTruthy();
      expect(decorationState.decorations).toBeTruthy();

      // Verify the decoration exists (decorations are not empty)
      const decorationSize = decorationState.decorations.size;
      expect(decorationSize).toBeGreaterThan(0);
    });

    it('should remove decoration when removing AI loading', () => {
      // Add decoration first
      editorView.addAILoadingDecoration(0, 8);

      // Verify it was added
      let decorationState = editorView.state.field(commentDecorationField);
      expect(decorationState.decorations.size).toBeGreaterThan(0);

      // Remove decoration
      editorView.removeAILoadingDecoration();

      // Verify it was removed
      decorationState = editorView.state.field(commentDecorationField);
      expect(decorationState.decorations.size).toBe(0);
    });
  });

  describe('AI improvement workflow', () => {
    it('should support full AI improvement workflow', () => {
      // 1. Get selection
      editorView.dispatch({
        selection: { anchor: 0, head: 8 },
      });

      const selection = editorView.getSelection();
      expect(selection).toBeTruthy();
      expect(selection.text).toBe('function');

      // 2. Add loading decoration
      editorView.addAILoadingDecoration(selection.from, selection.to);

      // 3. Simulate AI improvement (replace with improved text)
      const improvedText = 'async function';
      const success = editorView.replaceRange(selection.from, selection.to, improvedText);
      expect(success).toBe(true);

      // 4. Remove loading decoration
      editorView.removeAILoadingDecoration();

      // 5. Verify text was replaced
      const content = editorView.state.doc.toString();
      expect(content).toContain('async function test()');
    });
  });
});
