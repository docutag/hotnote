import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock;

// Mock File System Access API
global.window = global.window || {};

global.window.showDirectoryPicker = vi.fn();
global.window.showOpenFilePicker = vi.fn();
global.window.showSaveFilePicker = vi.fn();

// Mock file handle
export const createMockFileHandle = (name, content = '') => {
  return {
    name,
    kind: 'file',
    getFile: vi.fn().mockResolvedValue({
      name,
      text: vi.fn().mockResolvedValue(content),
    }),
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  };
};

// Mock directory handle
export const createMockDirectoryHandle = (name, entries = []) => {
  return {
    name,
    kind: 'directory',
    values: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        for (const entry of entries) {
          yield entry;
        }
      },
    }),
  };
};

// Reset mocks before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
