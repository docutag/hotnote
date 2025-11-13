import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSessionFileName,
  createEmptySession,
  loadSessionFile,
  saveSessionFile,
  initSessionManager,
  addCommentToSession,
  updateCommentInSession,
  deleteCommentFromSession,
  getCommentsForFile,
} from '../../src/storage/session-manager.js';

describe('Session Manager', () => {
  let mockFileSystemAdapter;
  let mockDirHandle;

  beforeEach(() => {
    // Mock FileSystemAdapter
    mockFileSystemAdapter = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };

    // Mock directory handle
    mockDirHandle = {
      name: 'test-project',
      getFileHandle: vi.fn(),
    };

    // Initialize session manager with mock adapter
    initSessionManager(mockFileSystemAdapter);
  });

  describe('createSessionFileName', () => {
    it('should return fixed session filename', () => {
      const filename = createSessionFileName(mockDirHandle);
      expect(filename).toBe('.session_properties.HN');
    });
  });

  describe('createEmptySession', () => {
    it('should create empty session object with correct structure', () => {
      const session = createEmptySession('my-project');

      expect(session).toHaveProperty('version', '1.0');
      expect(session).toHaveProperty('folderName', 'my-project');
      expect(session).toHaveProperty('lastModified');
      expect(session).toHaveProperty('session');
      expect(session.session).toHaveProperty('lastOpenFile', null);
      expect(session).toHaveProperty('comments');
      expect(Array.isArray(session.comments)).toBe(true);
    });

    it('should set timestamp', () => {
      const before = Date.now();
      const session = createEmptySession('test');
      const after = Date.now();

      expect(session.lastModified).toBeGreaterThanOrEqual(before);
      expect(session.lastModified).toBeLessThanOrEqual(after);
    });
  });

  describe('loadSessionFile', () => {
    it('should load and parse session file', async () => {
      const mockSessionData = {
        version: '1.0',
        folderName: 'test',
        session: { lastOpenFile: 'test.js' },
      };

      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(mockSessionData)),
        }),
      };

      mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
      mockFileSystemAdapter.readFile.mockResolvedValue(JSON.stringify(mockSessionData));

      const result = await loadSessionFile(mockDirHandle);

      expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('.session_properties.HN', {
        create: false,
      });
      expect(result).toEqual(mockSessionData);
    });

    it('should return null if file does not exist', async () => {
      mockDirHandle.getFileHandle.mockRejectedValue(new Error('NotFoundError'));

      const result = await loadSessionFile(mockDirHandle);

      expect(result).toBeNull();
    });

    it('should return null if JSON is invalid', async () => {
      const mockFileHandle = {};
      mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
      mockFileSystemAdapter.readFile.mockResolvedValue('{ invalid json');

      const result = await loadSessionFile(mockDirHandle);

      expect(result).toBeNull();
    });
  });

  describe('saveSessionFile', () => {
    it('should save session data to file', async () => {
      const sessionData = {
        version: '1.0',
        folderName: 'test',
        session: { lastOpenFile: 'index.js' },
      };

      const mockFileHandle = {};
      mockDirHandle.getFileHandle.mockResolvedValue(mockFileHandle);
      mockFileSystemAdapter.writeFile.mockResolvedValue(undefined);

      await saveSessionFile(mockDirHandle, sessionData);

      expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('.session_properties.HN', {
        create: true,
      });
      expect(sessionData).toHaveProperty('lastModified');
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(
        mockFileHandle,
        expect.stringContaining('"version"')
      );
    });

    it('should add lastModified timestamp when saving', async () => {
      const sessionData = {
        version: '1.0',
        folderName: 'test',
        session: {},
      };

      mockDirHandle.getFileHandle.mockResolvedValue({});
      mockFileSystemAdapter.writeFile.mockResolvedValue(undefined);

      const before = Date.now();
      await saveSessionFile(mockDirHandle, sessionData);
      const after = Date.now();

      expect(sessionData.lastModified).toBeGreaterThanOrEqual(before);
      expect(sessionData.lastModified).toBeLessThanOrEqual(after);
    });

    it('should handle errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDirHandle.getFileHandle.mockRejectedValue(new Error('Permission denied'));

      const sessionData = { version: '1.0' };

      await saveSessionFile(mockDirHandle, sessionData);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving session file:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should format JSON with indentation', async () => {
      const sessionData = {
        version: '1.0',
        session: { lastOpenFile: 'test.js' },
      };

      mockDirHandle.getFileHandle.mockResolvedValue({});
      mockFileSystemAdapter.writeFile.mockImplementation((handle, content) => {
        expect(content).toContain('\n');
        expect(content).toMatch(/"version": "1\.0"/);
        return Promise.resolve();
      });

      await saveSessionFile(mockDirHandle, sessionData);

      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle save and load cycle', async () => {
      const originalData = {
        version: '1.0',
        folderName: 'test-project',
        session: {
          lastOpenFile: {
            path: 'src/index.js',
            cursorLine: 10,
            cursorColumn: 5,
          },
        },
        comments: [],
      };

      let savedContent = '';
      const mockFileHandle = {};

      // Setup save
      mockDirHandle.getFileHandle.mockResolvedValueOnce(mockFileHandle);
      mockFileSystemAdapter.writeFile.mockImplementation((handle, content) => {
        savedContent = content;
        return Promise.resolve();
      });

      // Save
      await saveSessionFile(mockDirHandle, originalData);

      // Setup load
      mockDirHandle.getFileHandle.mockResolvedValueOnce(mockFileHandle);
      mockFileSystemAdapter.readFile.mockResolvedValue(savedContent);

      // Load
      const loadedData = await loadSessionFile(mockDirHandle);

      expect(loadedData.version).toBe(originalData.version);
      expect(loadedData.folderName).toBe(originalData.folderName);
      expect(loadedData.session.lastOpenFile.path).toBe('src/index.js');
      expect(loadedData.session.lastOpenFile.cursorLine).toBe(10);
    });
  });

  describe('Comment CRUD operations', () => {
    let sessionData;

    beforeEach(() => {
      sessionData = createEmptySession('test-project');
    });

    describe('addCommentToSession', () => {
      it('should add a comment to empty comments array', () => {
        const comment = {
          id: 'comment-1',
          fileRelativePath: 'src/index.js',
          userId: 'user-123',
          anchor: {
            prefix: 'function ',
            exact: 'test',
            suffix: '() {',
          },
          timestamp: Date.now(),
          resolved: false,
          thread: [
            {
              userId: 'user-123',
              text: 'This needs refactoring',
              timestamp: Date.now(),
            },
          ],
        };

        const result = addCommentToSession(sessionData, comment);

        expect(result).toBe(true);
        expect(sessionData.comments).toHaveLength(1);
        expect(sessionData.comments[0]).toEqual(comment);
      });

      it('should add multiple comments', () => {
        const comment1 = {
          id: 'comment-1',
          fileRelativePath: 'src/index.js',
          userId: 'user-123',
          anchor: { prefix: '', exact: 'test1', suffix: '' },
          timestamp: Date.now(),
          resolved: false,
          thread: [],
        };

        const comment2 = {
          id: 'comment-2',
          fileRelativePath: 'src/utils.js',
          userId: 'user-456',
          anchor: { prefix: '', exact: 'test2', suffix: '' },
          timestamp: Date.now(),
          resolved: false,
          thread: [],
        };

        addCommentToSession(sessionData, comment1);
        addCommentToSession(sessionData, comment2);

        expect(sessionData.comments).toHaveLength(2);
        expect(sessionData.comments[0].id).toBe('comment-1');
        expect(sessionData.comments[1].id).toBe('comment-2');
      });

      it('should not add comment with duplicate ID', () => {
        const comment = {
          id: 'duplicate-id',
          fileRelativePath: 'src/index.js',
          userId: 'user-123',
          anchor: { prefix: '', exact: 'test', suffix: '' },
          timestamp: Date.now(),
          resolved: false,
          thread: [],
        };

        const result1 = addCommentToSession(sessionData, comment);
        const result2 = addCommentToSession(sessionData, comment);

        expect(result1).toBe(true);
        expect(result2).toBe(false);
        expect(sessionData.comments).toHaveLength(1);
      });

      it('should initialize comments array if missing', () => {
        delete sessionData.comments;

        const comment = {
          id: 'comment-1',
          fileRelativePath: 'src/index.js',
          userId: 'user-123',
          anchor: { prefix: '', exact: 'test', suffix: '' },
          timestamp: Date.now(),
          resolved: false,
          thread: [],
        };

        const result = addCommentToSession(sessionData, comment);

        expect(result).toBe(true);
        expect(sessionData.comments).toHaveLength(1);
      });
    });

    describe('updateCommentInSession', () => {
      beforeEach(() => {
        sessionData.comments = [
          {
            id: 'comment-1',
            fileRelativePath: 'src/index.js',
            userId: 'user-123',
            anchor: { prefix: '', exact: 'test', suffix: '' },
            timestamp: 1000,
            resolved: false,
            thread: [
              {
                userId: 'user-123',
                text: 'Original comment',
                timestamp: 1000,
              },
            ],
          },
          {
            id: 'comment-2',
            fileRelativePath: 'src/utils.js',
            userId: 'user-456',
            anchor: { prefix: '', exact: 'util', suffix: '' },
            timestamp: 2000,
            resolved: false,
            thread: [],
          },
        ];
      });

      it('should update comment properties', () => {
        const updates = {
          resolved: true,
        };

        const result = updateCommentInSession(sessionData, 'comment-1', updates);

        expect(result).toBe(true);
        expect(sessionData.comments[0].resolved).toBe(true);
      });

      it('should add reply to thread', () => {
        const newReply = {
          userId: 'user-456',
          text: 'I agree with this',
          timestamp: 1500,
        };

        const updates = {
          thread: [...sessionData.comments[0].thread, newReply],
        };

        const result = updateCommentInSession(sessionData, 'comment-1', updates);

        expect(result).toBe(true);
        expect(sessionData.comments[0].thread).toHaveLength(2);
        expect(sessionData.comments[0].thread[1]).toEqual(newReply);
      });

      it('should return false for non-existent comment ID', () => {
        const result = updateCommentInSession(sessionData, 'non-existent', { resolved: true });

        expect(result).toBe(false);
      });

      it('should not modify other comments', () => {
        const originalComment2 = { ...sessionData.comments[1] };

        updateCommentInSession(sessionData, 'comment-1', { resolved: true });

        expect(sessionData.comments[1]).toEqual(originalComment2);
      });

      it('should handle multiple property updates', () => {
        const updates = {
          resolved: true,
          fileRelativePath: 'src/new-path.js',
          anchor: { prefix: 'new', exact: 'anchor', suffix: 'text' },
        };

        const result = updateCommentInSession(sessionData, 'comment-1', updates);

        expect(result).toBe(true);
        expect(sessionData.comments[0].resolved).toBe(true);
        expect(sessionData.comments[0].fileRelativePath).toBe('src/new-path.js');
        expect(sessionData.comments[0].anchor.exact).toBe('anchor');
      });
    });

    describe('deleteCommentFromSession', () => {
      beforeEach(() => {
        sessionData.comments = [
          {
            id: 'comment-1',
            fileRelativePath: 'src/index.js',
            userId: 'user-123',
            anchor: { prefix: '', exact: 'test1', suffix: '' },
            timestamp: 1000,
            resolved: false,
            thread: [],
          },
          {
            id: 'comment-2',
            fileRelativePath: 'src/utils.js',
            userId: 'user-456',
            anchor: { prefix: '', exact: 'test2', suffix: '' },
            timestamp: 2000,
            resolved: false,
            thread: [],
          },
          {
            id: 'comment-3',
            fileRelativePath: 'src/helpers.js',
            userId: 'user-789',
            anchor: { prefix: '', exact: 'test3', suffix: '' },
            timestamp: 3000,
            resolved: false,
            thread: [],
          },
        ];
      });

      it('should delete comment by ID', () => {
        const result = deleteCommentFromSession(sessionData, 'comment-2');

        expect(result).toBe(true);
        expect(sessionData.comments).toHaveLength(2);
        expect(sessionData.comments.find((c) => c.id === 'comment-2')).toBeUndefined();
        expect(sessionData.comments[0].id).toBe('comment-1');
        expect(sessionData.comments[1].id).toBe('comment-3');
      });

      it('should return false for non-existent comment ID', () => {
        const result = deleteCommentFromSession(sessionData, 'non-existent');

        expect(result).toBe(false);
        expect(sessionData.comments).toHaveLength(3);
      });

      it('should delete first comment', () => {
        deleteCommentFromSession(sessionData, 'comment-1');

        expect(sessionData.comments).toHaveLength(2);
        expect(sessionData.comments[0].id).toBe('comment-2');
      });

      it('should delete last comment', () => {
        deleteCommentFromSession(sessionData, 'comment-3');

        expect(sessionData.comments).toHaveLength(2);
        expect(sessionData.comments[1].id).toBe('comment-2');
      });

      it('should handle deleting all comments', () => {
        deleteCommentFromSession(sessionData, 'comment-1');
        deleteCommentFromSession(sessionData, 'comment-2');
        deleteCommentFromSession(sessionData, 'comment-3');

        expect(sessionData.comments).toHaveLength(0);
      });
    });

    describe('getCommentsForFile', () => {
      beforeEach(() => {
        sessionData.comments = [
          {
            id: 'comment-1',
            fileRelativePath: 'src/index.js',
            userId: 'user-123',
            resolved: false,
          },
          {
            id: 'comment-2',
            fileRelativePath: 'src/utils.js',
            userId: 'user-456',
            resolved: false,
          },
          {
            id: 'comment-3',
            fileRelativePath: 'src/index.js',
            userId: 'user-789',
            resolved: true,
          },
          {
            id: 'comment-4',
            fileRelativePath: 'src/helpers.js',
            userId: 'user-123',
            resolved: false,
          },
        ];
      });

      it('should return comments for specific file', () => {
        const comments = getCommentsForFile(sessionData, 'src/index.js');

        expect(comments).toHaveLength(2);
        expect(comments[0].id).toBe('comment-1');
        expect(comments[1].id).toBe('comment-3');
      });

      it('should return empty array for file with no comments', () => {
        const comments = getCommentsForFile(sessionData, 'src/no-comments.js');

        expect(comments).toEqual([]);
      });

      it('should return empty array if comments array is missing', () => {
        delete sessionData.comments;

        const comments = getCommentsForFile(sessionData, 'src/index.js');

        expect(comments).toEqual([]);
      });

      it('should include both resolved and unresolved comments', () => {
        const comments = getCommentsForFile(sessionData, 'src/index.js');

        expect(comments.some((c) => c.resolved)).toBe(true);
        expect(comments.some((c) => !c.resolved)).toBe(true);
      });

      it('should handle file paths with different separators', () => {
        sessionData.comments[0].fileRelativePath = 'src\\index.js'; // Windows-style

        const comments = getCommentsForFile(sessionData, 'src\\index.js');

        expect(comments).toHaveLength(1);
        expect(comments[0].id).toBe('comment-1');
      });
    });

    describe('integration scenarios', () => {
      it('should handle complete comment lifecycle', () => {
        // Add comment
        const comment = {
          id: 'lifecycle-test',
          fileRelativePath: 'src/test.js',
          userId: 'user-123',
          anchor: { prefix: '', exact: 'code', suffix: '' },
          timestamp: Date.now(),
          resolved: false,
          thread: [
            {
              userId: 'user-123',
              text: 'Initial comment',
              timestamp: Date.now(),
            },
          ],
        };

        addCommentToSession(sessionData, comment);
        expect(sessionData.comments).toHaveLength(1);

        // Add reply
        const newReply = {
          userId: 'user-456',
          text: 'Reply to comment',
          timestamp: Date.now(),
        };
        updateCommentInSession(sessionData, 'lifecycle-test', {
          thread: [...sessionData.comments[0].thread, newReply],
        });
        expect(sessionData.comments[0].thread).toHaveLength(2);

        // Resolve comment
        updateCommentInSession(sessionData, 'lifecycle-test', { resolved: true });
        expect(sessionData.comments[0].resolved).toBe(true);

        // Delete comment
        deleteCommentFromSession(sessionData, 'lifecycle-test');
        expect(sessionData.comments).toHaveLength(0);
      });

      it('should maintain data integrity across operations', () => {
        // Add multiple comments
        for (let i = 1; i <= 5; i++) {
          addCommentToSession(sessionData, {
            id: `comment-${i}`,
            fileRelativePath: `src/file${i}.js`,
            userId: 'user-123',
            anchor: { prefix: '', exact: `text${i}`, suffix: '' },
            timestamp: Date.now(),
            resolved: false,
            thread: [],
          });
        }

        expect(sessionData.comments).toHaveLength(5);

        // Update some comments
        updateCommentInSession(sessionData, 'comment-2', { resolved: true });
        updateCommentInSession(sessionData, 'comment-4', { resolved: true });

        // Delete one comment
        deleteCommentFromSession(sessionData, 'comment-3');

        expect(sessionData.comments).toHaveLength(4);
        expect(sessionData.comments.filter((c) => c.resolved)).toHaveLength(2);
        expect(sessionData.comments.find((c) => c.id === 'comment-3')).toBeUndefined();
      });
    });
  });
});
