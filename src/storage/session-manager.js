import { appState } from '../state/app-state.js';
import { debounce } from '../utils/helpers.js';

/**
 * Session Management Module
 * Handles persistence and restoration of editor state to .session_properties.HN files
 */

// FileSystemAdapter will be passed as dependency to avoid circular imports
let FileSystemAdapter = null;

/**
 * Initialize the session manager with FileSystemAdapter dependency
 * @param {Object} adapter - The FileSystemAdapter object
 */
export function initSessionManager(adapter) {
  FileSystemAdapter = adapter;
}

/**
 * Create session filename
 * @param {FileSystemDirectoryHandle} _dirHandle - Directory handle (unused, for compatibility)
 * @returns {string} Session filename
 */
export function createSessionFileName(_dirHandle) {
  return '.session_properties.HN';
}

/**
 * Load session file from directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<Object|null>} Session data or null if not found
 */
export async function loadSessionFile(dirHandle) {
  try {
    const sessionFileName = createSessionFileName(dirHandle);
    const sessionFileHandle = await dirHandle.getFileHandle(sessionFileName, { create: false });
    const sessionContent = await FileSystemAdapter.readFile(sessionFileHandle);
    return JSON.parse(sessionContent);
  } catch {
    // File doesn't exist or invalid JSON - return null
    return null;
  }
}

/**
 * Save session data to directory
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {Object} sessionData - Session data to save
 * @returns {Promise<void>}
 */
export async function saveSessionFile(dirHandle, sessionData) {
  try {
    const sessionFileName = createSessionFileName(dirHandle);
    const sessionFileHandle = await dirHandle.getFileHandle(sessionFileName, { create: true });
    sessionData.lastModified = Date.now();
    const content = JSON.stringify(sessionData, null, 2);
    await FileSystemAdapter.writeFile(sessionFileHandle, content);
  } catch (err) {
    console.error('Error saving session file:', err);
  }
}

/**
 * Create empty session object
 * @param {string} folderName - Folder name
 * @returns {Object} Empty session object
 */
export function createEmptySession(folderName) {
  return {
    version: '1.0',
    folderName: folderName,
    lastModified: Date.now(),
    session: {
      lastOpenFile: null,
    },
    comments: [],
  };
}

/**
 * Get relative file path for session storage
 * @param {Function} getRelativeFilePathFn - Function to get relative file path
 * @returns {string|null} Relative file path
 */
function getSessionFilePath(getRelativeFilePathFn) {
  return getRelativeFilePathFn();
}

/**
 * Save current editor state to session file
 * @param {Function} getRelativeFilePathFn - Function to get relative file path
 * @returns {Promise<void>}
 */
export async function saveEditorStateToSession(getRelativeFilePathFn) {
  // Don't save if TOC navigation is in progress
  if (window.blockSessionSave) {
    return;
  }

  // Don't save if we just restored state (wait for scroll animation to complete)
  // Block for 1 second (animation is 250ms, plus margin for safety)
  const timeSinceRestoration = Date.now() - appState.lastRestorationTime;
  if (appState.lastRestorationTime > 0 && timeSinceRestoration < 1000) {
    return;
  }

  if (!appState.currentDirHandle || !appState.currentFileHandle) {
    return;
  }

  try {
    const filePath = getSessionFilePath(getRelativeFilePathFn);
    if (!filePath) {
      return;
    }

    let sessionData = await loadSessionFile(appState.currentDirHandle);
    if (!sessionData) {
      sessionData = createEmptySession(appState.currentDirHandle.name);
    }

    // Get current editor state
    let cursorLine = 0;
    let cursorColumn = 0;
    let scrollTop = 0;
    let scrollLeft = 0;
    let editorMode = 'source'; // Default for non-markdown files

    if (appState.editorManager) {
      // Markdown file using EditorManager
      const cursor = appState.editorManager.getCursor();
      cursorLine = cursor.line;
      cursorColumn = cursor.column;
      scrollTop = appState.editorManager.getScrollPosition();
      editorMode = appState.editorManager.getMode();
    } else if (appState.editorView) {
      // Non-markdown file using CodeMirror
      const pos = appState.editorView.state.selection.main.head;
      const line = appState.editorView.state.doc.lineAt(pos);
      cursorLine = line.number - 1; // Convert to 0-based
      cursorColumn = pos - line.from;
      scrollTop = appState.editorView.scrollDOM.scrollTop;
      scrollLeft = appState.editorView.scrollDOM.scrollLeft;
    }

    sessionData.session.lastOpenFile = {
      path: filePath,
      cursorLine: cursorLine,
      cursorColumn: cursorColumn,
      scrollTop: scrollTop,
      scrollLeft: scrollLeft,
      editorMode: editorMode,
    };

    await saveSessionFile(appState.rootDirHandle, sessionData);
  } catch (err) {
    console.error('Error saving editor state:', err);
  }
}

/**
 * Create debounced version of saveEditorStateToSession
 * @param {Function} getRelativeFilePathFn - Function to get relative file path
 * @returns {Function} Debounced save function
 */
export function createDebouncedSaveEditorState(getRelativeFilePathFn) {
  return debounce(() => saveEditorStateToSession(getRelativeFilePathFn), 2000);
}

/**
 * Add a comment to the session
 * @param {Object} sessionData - Session data object
 * @param {Object} comment - Comment object to add
 * @returns {boolean} True if added successfully, false if comment ID already exists
 */
export function addCommentToSession(sessionData, comment) {
  // Initialize comments array if it doesn't exist
  if (!sessionData.comments) {
    sessionData.comments = [];
  }

  // Check if comment with this ID already exists
  const existingComment = sessionData.comments.find((c) => c.id === comment.id);
  if (existingComment) {
    return false;
  }

  // Add the comment
  sessionData.comments.push(comment);
  return true;
}

/**
 * Update a comment in the session
 * @param {Object} sessionData - Session data object
 * @param {string} commentId - ID of the comment to update
 * @param {Object} updates - Properties to update
 * @returns {boolean} True if updated successfully, false if comment not found
 */
export function updateCommentInSession(sessionData, commentId, updates) {
  if (!sessionData.comments) {
    return false;
  }

  const comment = sessionData.comments.find((c) => c.id === commentId);
  if (!comment) {
    return false;
  }

  // Apply updates
  Object.assign(comment, updates);
  return true;
}

/**
 * Delete a comment from the session
 * @param {Object} sessionData - Session data object
 * @param {string} commentId - ID of the comment to delete
 * @returns {boolean} True if deleted successfully, false if comment not found
 */
export function deleteCommentFromSession(sessionData, commentId) {
  if (!sessionData.comments) {
    return false;
  }

  const index = sessionData.comments.findIndex((c) => c.id === commentId);
  if (index === -1) {
    return false;
  }

  sessionData.comments.splice(index, 1);
  return true;
}

/**
 * Get all comments for a specific file
 * @param {Object} sessionData - Session data object
 * @param {string} filePath - Relative file path
 * @returns {Array} Array of comments for the file
 */
export function getCommentsForFile(sessionData, filePath) {
  if (!sessionData.comments) {
    return [];
  }

  return sessionData.comments.filter((c) => c.fileRelativePath === filePath);
}
