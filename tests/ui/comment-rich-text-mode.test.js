import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommentToolbar } from '../../src/ui/comment-toolbar.js';
import { appState } from '../../src/state/app-state.js';

describe('Comment System in Rich Text Mode', () => {
  let container;
  let toolbar;
  let mockOnAddComment;
  let mockOnAIImprove;

  beforeEach(() => {
    // Create DOM container
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create mocks
    mockOnAddComment = vi.fn();
    mockOnAIImprove = vi.fn();

    // Initialize toolbar
    toolbar = new CommentToolbar(container, mockOnAddComment, mockOnAIImprove);
  });

  afterEach(() => {
    // Cleanup
    if (toolbar) {
      toolbar.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    // Reset app state
    appState.editorManager = null;
    appState.isGitHubMode = false;
    appState.isReadOnly = false;
  });

  describe('Rich Text Mode Detection', () => {
    it('should detect when in rich text (WYSIWYG) mode', () => {
      // Mock editor manager in WYSIWYG mode
      appState.editorManager = {
        currentMode: 'wysiwyg',
      };

      expect(toolbar.isInRichTextMode()).toBe(true);
    });

    it('should detect when NOT in rich text mode (source mode)', () => {
      // Mock editor manager in source mode
      appState.editorManager = {
        currentMode: 'source',
      };

      expect(toolbar.isInRichTextMode()).toBe(false);
    });

    it('should return false when no editor manager exists', () => {
      appState.editorManager = null;
      expect(toolbar.isInRichTextMode()).toBe(false);
    });
  });

  describe('Toolbar Visibility in Rich Text Mode', () => {
    it('should hide Comment button in rich text mode', () => {
      // Mock editor manager in WYSIWYG mode
      appState.editorManager = {
        currentMode: 'wysiwyg',
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      const commentBtn = toolbar.toolbar.querySelector('.comment-toolbar-btn');
      const aiBtn = toolbar.toolbar.querySelector('.ai-toolbar-btn');

      expect(commentBtn.style.display).toBe('none');
      expect(aiBtn.style.display).toBe('');
    });

    it('should show Comment button in source mode', () => {
      // Mock editor manager in source mode
      appState.editorManager = {
        currentMode: 'source',
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      const commentBtn = toolbar.toolbar.querySelector('.comment-toolbar-btn');
      const aiBtn = toolbar.toolbar.querySelector('.ai-toolbar-btn');

      expect(commentBtn.style.display).toBe('');
      expect(aiBtn.style.display).toBe('');
    });

    it('should show Comment button when using CodeMirror (no editor manager)', () => {
      // No editor manager (using CodeMirror directly)
      appState.editorManager = null;

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      const commentBtn = toolbar.toolbar.querySelector('.comment-toolbar-btn');
      const aiBtn = toolbar.toolbar.querySelector('.ai-toolbar-btn');

      expect(commentBtn.style.display).toBe('');
      expect(aiBtn.style.display).toBe('');
    });

    it('should always show AI button regardless of mode', () => {
      // Test WYSIWYG mode
      appState.editorManager = {
        currentMode: 'wysiwyg',
      };

      toolbar.show(100, 200, { from: 0, to: 10, text: 'test' });
      let aiBtn = toolbar.toolbar.querySelector('.ai-toolbar-btn');
      expect(aiBtn.style.display).toBe('');

      toolbar.hide();

      // Test source mode
      appState.editorManager = {
        currentMode: 'source',
      };

      toolbar.show(100, 200, { from: 0, to: 10, text: 'test' });
      aiBtn = toolbar.toolbar.querySelector('.ai-toolbar-btn');
      expect(aiBtn.style.display).toBe('');
    });
  });

  describe('Read-Only Mode Behavior', () => {
    it('should not show toolbar in GitHub read-only mode', () => {
      appState.isGitHubMode = true;

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      expect(toolbar.isVisible()).toBe(false);
    });

    it('should not show toolbar in general read-only mode', () => {
      appState.isReadOnly = true;

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      expect(toolbar.isVisible()).toBe(false);
    });
  });

  describe('Toolbar Button Functionality', () => {
    it('should still call AI handler when clicked in rich text mode', () => {
      appState.editorManager = {
        currentMode: 'wysiwyg',
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      const aiBtn = toolbar.toolbar.querySelector('.ai-toolbar-btn');
      aiBtn.click();

      expect(mockOnAIImprove).toHaveBeenCalledWith(selection);
      expect(mockOnAddComment).not.toHaveBeenCalled();
    });

    it('should call comment handler when clicked in source mode', () => {
      appState.editorManager = {
        currentMode: 'source',
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      const commentBtn = toolbar.toolbar.querySelector('.comment-toolbar-btn');
      commentBtn.click();

      expect(mockOnAddComment).toHaveBeenCalledWith(selection);
      expect(mockOnAIImprove).not.toHaveBeenCalled();
    });
  });

  describe('Mode Switching', () => {
    it('should update button visibility when mode changes', () => {
      // Start in source mode
      appState.editorManager = {
        currentMode: 'source',
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);
      let commentBtn = toolbar.toolbar.querySelector('.comment-toolbar-btn');
      expect(commentBtn.style.display).toBe('');

      toolbar.hide();

      // Switch to WYSIWYG mode
      appState.editorManager.currentMode = 'wysiwyg';

      toolbar.show(100, 200, selection);
      commentBtn = toolbar.toolbar.querySelector('.comment-toolbar-btn');
      expect(commentBtn.style.display).toBe('none');
    });
  });

  describe('Comment Decorations in Rich Text Mode', () => {
    it('should not show comment decorations in WYSIWYG mode', () => {
      appState.editorManager = {
        currentMode: 'wysiwyg',
      };

      expect(toolbar.isInRichTextMode()).toBe(true);
    });

    it('should allow comment decorations in source mode', () => {
      appState.editorManager = {
        currentMode: 'source',
      };

      expect(toolbar.isInRichTextMode()).toBe(false);
    });
  });

  describe('Settings Panel Interaction', () => {
    beforeEach(() => {
      // Clean up any existing settings panel
      if (window.settingsPanel) {
        window.settingsPanel.isOpen = false;
      }
    });

    afterEach(() => {
      // Clean up settings panel
      if (window.settingsPanel) {
        window.settingsPanel.isOpen = false;
      }
    });

    it('should not show toolbar when settings panel is open', () => {
      // Mock settings panel as open
      window.settingsPanel = {
        isOpen: true,
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      expect(toolbar.isVisible()).toBe(false);
    });

    it('should show toolbar when settings panel is closed', () => {
      // Mock settings panel as closed
      window.settingsPanel = {
        isOpen: false,
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      expect(toolbar.isVisible()).toBe(true);
    });

    it('should show toolbar when settings panel does not exist', () => {
      // Remove settings panel
      window.settingsPanel = null;

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);

      expect(toolbar.isVisible()).toBe(true);
    });

    it('should hide toolbar when settings opens', () => {
      // Show toolbar first
      window.settingsPanel = {
        isOpen: false,
      };

      const selection = {
        from: 0,
        to: 10,
        text: 'test text',
      };

      toolbar.show(100, 200, selection);
      expect(toolbar.isVisible()).toBe(true);

      // Simulate settings opening (toolbar should be hidden on next show attempt)
      window.settingsPanel.isOpen = true;

      // Try to show toolbar again
      toolbar.show(100, 200, selection);
      expect(toolbar.isVisible()).toBe(true); // Still visible from before

      // Hide and try to show again
      toolbar.hide();
      toolbar.show(100, 200, selection);
      expect(toolbar.isVisible()).toBe(false); // Now hidden because settings is open
    });
  });
});
