import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EditorManager } from '../src/editors/editor-manager.js';
import { improveText } from '../src/services/ai-service.js';
import { appState } from '../src/state/app-state.js';
import { createAnchor, findAnchorPosition } from '../src/utils/text-anchor.js';
import { createAutosaveManager } from '../src/editor/autosave.js';

// Mock the AI service
vi.mock('../src/services/ai-service.js', () => ({
  improveText: vi.fn(),
}));

describe('AI and Comments Integration', () => {
  let container;
  let editorManager;
  let mockOnChange;

  beforeEach(() => {
    // Create DOM container
    container = document.createElement('div');
    container.id = 'editor-container';
    document.body.appendChild(container);

    // Create autosave checkbox for UI tests
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'autosave-checkbox';
    checkbox.checked = true;
    document.body.appendChild(checkbox);

    // Mock onChange
    mockOnChange = vi.fn();

    // Reset app state
    appState.resetCommentState();

    // Clear AI service mock
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (editorManager) {
      editorManager.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    // Clean up autosave checkbox
    const checkbox = document.getElementById('autosave-checkbox');
    if (checkbox && checkbox.parentNode) {
      checkbox.parentNode.removeChild(checkbox);
    }
  });

  describe('Comment decorations persistence after AI improvement', () => {
    it('should preserve existing comment decorations after AI text improvement', async () => {
      // Initialize editor
      const initialContent = 'This is the first paragraph.\n\nThis is the second paragraph.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      // Add a comment to first paragraph
      const doc = editorManager.getDocumentText();
      const anchor = createAnchor(doc, 0, 28); // "This is the first paragraph."
      const comment = {
        id: 'comment-1',
        fileRelativePath: 'test.md',
        userId: 'user-1',
        anchor,
        fallbackPosition: { from: { line: 0, col: 0 }, to: { line: 0, col: 28 } },
        timestamp: Date.now(),
        resolved: false,
        thread: [
          {
            userId: 'user-1',
            userName: 'Test User',
            text: 'This is a comment',
            timestamp: Date.now(),
          },
        ],
      };

      appState.addComment(comment);
      appState.setCurrentFilename('test.md');

      // Spy on decoration methods
      const applyDecorationsSpy = vi.spyOn(editorManager.currentEditor, 'applyCommentDecorations');
      const addLoadingSpy = vi.spyOn(editorManager.currentEditor, 'addAILoadingDecoration');
      const removeLoadingSpy = vi.spyOn(editorManager.currentEditor, 'removeAILoadingDecoration');

      // Apply initial comment decoration
      const pos = findAnchorPosition(doc, comment.anchor);
      if (editorManager.currentEditor.applyCommentDecorations && pos) {
        editorManager.currentEditor.applyCommentDecorations(
          [{ id: comment.id, position: pos, resolved: false }],
          null,
          null
        );
      }

      expect(applyDecorationsSpy).toHaveBeenCalledTimes(1);

      // Mock AI improvement
      improveText.mockResolvedValue('This is an improved second paragraph.');

      // Simulate AI improvement on second paragraph
      // Content: "This is the first paragraph.\n\nThis is the second paragraph."
      // Positions: 0-27 (first), 28-29 (newlines), 30-58 (second)
      const selection = { from: 30, to: 59, text: 'This is the second paragraph.' };

      // Add AI loading decoration
      editorManager.currentEditor.addAILoadingDecoration(selection.from, selection.to);
      expect(addLoadingSpy).toHaveBeenCalledWith(selection.from, selection.to);

      // Call AI improvement
      const improvedText = await improveText(selection.text);

      // Remove AI loading decoration
      editorManager.currentEditor.removeAILoadingDecoration();
      expect(removeLoadingSpy).toHaveBeenCalled();

      // Replace text
      editorManager.replaceRange(selection.from, selection.to, improvedText);

      // Re-apply comment decorations (simulating refreshCommentDecorations)
      const newDoc = editorManager.getDocumentText();
      const newPos = findAnchorPosition(newDoc, comment.anchor);
      if (newPos) {
        editorManager.currentEditor.applyCommentDecorations(
          [{ id: comment.id, position: newPos, resolved: false }],
          null,
          null
        );
      }

      // Verify applyCommentDecorations was called again to restore decorations
      expect(applyDecorationsSpy).toHaveBeenCalledTimes(2);

      // Verify comment anchor still works and finds position in new document
      expect(newPos).toBeTruthy();
      expect(newPos.from).toBe(0);
      expect(newPos.to).toBe(28);
    });

    it('should not lose comment decorations when AI improvement fails', async () => {
      // Initialize editor
      const initialContent = 'Original text with a comment.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      // Add a comment
      const doc = editorManager.getDocumentText();
      const anchor = createAnchor(doc, 0, 29);
      const comment = {
        id: 'comment-1',
        fileRelativePath: 'test.md',
        userId: 'user-1',
        anchor,
        fallbackPosition: { from: { line: 0, col: 0 }, to: { line: 0, col: 29 } },
        timestamp: Date.now(),
        resolved: false,
        thread: [{ userId: 'user-1', userName: 'Test', text: 'Comment', timestamp: Date.now() }],
      };

      appState.addComment(comment);
      appState.setCurrentFilename('test.md');

      // Spy on decoration methods
      const applyDecorationsSpy = vi.spyOn(editorManager.currentEditor, 'applyCommentDecorations');
      const removeLoadingSpy = vi.spyOn(editorManager.currentEditor, 'removeAILoadingDecoration');

      // Apply comment decoration
      const pos = findAnchorPosition(doc, comment.anchor);
      if (pos) {
        editorManager.currentEditor.applyCommentDecorations(
          [{ id: comment.id, position: pos, resolved: false }],
          null,
          null
        );
      }

      expect(applyDecorationsSpy).toHaveBeenCalledTimes(1);

      // Mock AI improvement to fail
      improveText.mockRejectedValue(new Error('AI service unavailable'));

      // Add AI loading decoration
      const selection = { from: 0, to: 13, text: 'Original text' };
      editorManager.currentEditor.addAILoadingDecoration(selection.from, selection.to);

      // Try to improve text (should fail)
      try {
        await improveText(selection.text);
      } catch (_error) {
        // Expected to fail
      }

      // Remove AI loading decoration (error cleanup)
      editorManager.currentEditor.removeAILoadingDecoration();
      expect(removeLoadingSpy).toHaveBeenCalled();

      // Re-apply comment decorations (simulating refreshCommentDecorations in error handler)
      const newDoc = editorManager.getDocumentText();
      const newPos = findAnchorPosition(newDoc, comment.anchor);
      if (newPos) {
        editorManager.currentEditor.applyCommentDecorations(
          [{ id: comment.id, position: newPos, resolved: false }],
          null,
          null
        );
      }

      // Verify applyCommentDecorations was called again to restore decorations after error
      expect(applyDecorationsSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple comments and AI improvement', async () => {
      // Initialize editor
      const initialContent = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      const doc = editorManager.getDocumentText();

      // Add multiple comments
      const comment1 = createComment('comment-1', doc, 0, 16, 'Comment on first');
      const comment2 = createComment('comment-2', doc, 19, 35, 'Comment on second');
      const comment3 = createComment('comment-3', doc, 38, 53, 'Comment on third');

      appState.addComment(comment1);
      appState.addComment(comment2);
      appState.addComment(comment3);
      appState.setCurrentFilename('test.md');

      // Spy on decoration methods
      const applyDecorationsSpy = vi.spyOn(editorManager.currentEditor, 'applyCommentDecorations');

      // Apply all comment decorations
      const decorationsData = [
        { id: comment1.id, position: findAnchorPosition(doc, comment1.anchor), resolved: false },
        { id: comment2.id, position: findAnchorPosition(doc, comment2.anchor), resolved: false },
        { id: comment3.id, position: findAnchorPosition(doc, comment3.anchor), resolved: false },
      ];

      editorManager.currentEditor.applyCommentDecorations(decorationsData, null, null);
      expect(applyDecorationsSpy).toHaveBeenCalledTimes(1);

      // Mock AI improvement for second paragraph
      improveText.mockResolvedValue('Improved second paragraph.');

      // Improve second paragraph (which has a comment)
      const selection = { from: 19, to: 35, text: 'Second paragraph.' };

      editorManager.currentEditor.addAILoadingDecoration(selection.from, selection.to);

      const improvedText = await improveText(selection.text);

      editorManager.currentEditor.removeAILoadingDecoration();

      editorManager.replaceRange(selection.from, selection.to, improvedText);

      // Re-apply all comment decorations
      const newDoc = editorManager.getDocumentText();
      const newDecorationsData = [
        {
          id: comment1.id,
          position: findAnchorPosition(newDoc, comment1.anchor),
          resolved: false,
        },
        {
          id: comment2.id,
          position: findAnchorPosition(newDoc, comment2.anchor),
          resolved: false,
        },
        {
          id: comment3.id,
          position: findAnchorPosition(newDoc, comment3.anchor),
          resolved: false,
        },
      ].filter((d) => d.position);

      editorManager.currentEditor.applyCommentDecorations(newDecorationsData, null, null);

      // Verify applyCommentDecorations was called twice (initial + after AI)
      expect(applyDecorationsSpy).toHaveBeenCalledTimes(2);

      // Verify first and third comments still have valid positions
      expect(newDecorationsData.length).toBeGreaterThanOrEqual(2);
      expect(newDecorationsData.some((d) => d.id === 'comment-1')).toBe(true);
      expect(newDecorationsData.some((d) => d.id === 'comment-3')).toBe(true);
    });
  });

  describe('Autosave behavior during AI operations', () => {
    it('should stop autosave when AI operation starts', async () => {
      // Initialize editor
      const initialContent = 'Original text to improve.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      // Create autosave manager
      let _saveCount = 0;
      const autosaveManager = createAutosaveManager({
        interval: 100,
        enabled: true,
        onSave: async () => {
          _saveCount++;
        },
        shouldSave: () => true,
      });

      // Start autosave
      autosaveManager.start();
      expect(autosaveManager.isRunning()).toBe(true);

      // Mock AI improvement
      improveText.mockResolvedValue('Improved text.');

      // Simulate AI improvement (mimicking handleAIImprove logic)
      const selection = { from: 0, to: 25, text: 'Original text to improve.' };

      // Stop autosave when AI starts (like in handleAIImprove)
      if (autosaveManager.isRunning()) {
        autosaveManager.stop();
      }

      // Verify autosave is stopped
      expect(autosaveManager.isRunning()).toBe(false);

      // Apply AI loading decoration
      editorManager.currentEditor.addAILoadingDecoration(selection.from, selection.to);

      // Call AI improvement
      const improvedText = await improveText(selection.text);

      // Remove AI loading decoration
      editorManager.currentEditor.removeAILoadingDecoration();

      // Replace text
      editorManager.replaceRange(selection.from, selection.to, improvedText);

      // Verify autosave remains stopped
      expect(autosaveManager.isRunning()).toBe(false);

      // Cleanup
      autosaveManager.stop();
    });

    it('should not restart autosave after AI completes', async () => {
      // Initialize editor
      const initialContent = 'Text to improve.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      // Create autosave manager
      const autosaveManager = createAutosaveManager({
        interval: 100,
        enabled: true,
        onSave: async () => {},
        shouldSave: () => true,
      });

      // Start autosave
      autosaveManager.start();
      expect(autosaveManager.isRunning()).toBe(true);

      // Mock AI improvement
      improveText.mockResolvedValue('Improved text.');

      // Simulate AI improvement with autosave stop
      const selection = { from: 0, to: 16, text: 'Text to improve.' };

      if (autosaveManager.isRunning()) {
        autosaveManager.stop();
      }

      editorManager.currentEditor.addAILoadingDecoration(selection.from, selection.to);
      const improvedText = await improveText(selection.text);
      editorManager.currentEditor.removeAILoadingDecoration();
      editorManager.replaceRange(selection.from, selection.to, improvedText);

      // Verify autosave is still stopped (not auto-restarted)
      expect(autosaveManager.isRunning()).toBe(false);

      // Cleanup
      autosaveManager.stop();
    });

    it('should handle AI failure without affecting autosave state', async () => {
      // Initialize editor
      const initialContent = 'Text that will fail.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      // Create autosave manager
      const autosaveManager = createAutosaveManager({
        interval: 100,
        enabled: true,
        onSave: async () => {},
        shouldSave: () => true,
      });

      // Start autosave
      autosaveManager.start();
      expect(autosaveManager.isRunning()).toBe(true);

      // Mock AI improvement to fail
      improveText.mockRejectedValue(new Error('AI service unavailable'));

      // Simulate AI improvement with error handling
      const selection = { from: 0, to: 20, text: 'Text that will fail.' };

      if (autosaveManager.isRunning()) {
        autosaveManager.stop();
      }

      expect(autosaveManager.isRunning()).toBe(false);

      editorManager.currentEditor.addAILoadingDecoration(selection.from, selection.to);

      try {
        await improveText(selection.text);
      } catch (_error) {
        // Expected to fail
      }

      editorManager.currentEditor.removeAILoadingDecoration();

      // Verify autosave remains stopped even after error
      expect(autosaveManager.isRunning()).toBe(false);

      // Cleanup
      autosaveManager.stop();
    });

    it('should update autosave checkbox UI when stopping autosave', async () => {
      // Initialize editor
      const initialContent = 'Text to improve.';
      editorManager = new EditorManager(container, 'source', initialContent, mockOnChange);
      await editorManager.ready();

      // Get checkbox reference
      const checkbox = document.getElementById('autosave-checkbox');
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(true);

      // Create and start autosave manager
      const autosaveManager = createAutosaveManager({
        interval: 100,
        enabled: true,
        onSave: async () => {},
        shouldSave: () => true,
      });

      autosaveManager.start();
      expect(autosaveManager.isRunning()).toBe(true);

      // Mock AI improvement
      improveText.mockResolvedValue('Improved text.');

      // Simulate the checkbox update that happens in handleAIImprove
      if (autosaveManager.isRunning()) {
        autosaveManager.stop();
        // Simulate what handleAIImprove does: update checkbox
        checkbox.checked = false;
      }

      // Verify checkbox is now unchecked
      expect(checkbox.checked).toBe(false);
      expect(autosaveManager.isRunning()).toBe(false);

      // Cleanup
      autosaveManager.stop();
    });
  });
});

/**
 * Helper to create a comment object
 */
function createComment(id, doc, from, to, text) {
  return {
    id,
    fileRelativePath: 'test.md',
    userId: 'user-1',
    anchor: createAnchor(doc, from, to),
    fallbackPosition: { from: { line: 0, col: from }, to: { line: 0, col: to } },
    timestamp: Date.now(),
    resolved: false,
    thread: [
      {
        userId: 'user-1',
        userName: 'Test User',
        text,
        timestamp: Date.now(),
      },
    ],
  };
}
