import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getUserId,
  getUserDisplayName,
  setUserDisplayName,
  isCurrentUser,
  getUserInfo,
  clearUserData,
} from '../../src/storage/user-manager.js';

describe('User Manager', () => {
  let mockLocalStorage;
  let cryptoSpy;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      },
    };

    // Replace global localStorage
    global.localStorage = mockLocalStorage;

    // Mock crypto.randomUUID()
    cryptoSpy = vi.spyOn(global.crypto, 'randomUUID');
  });

  afterEach(() => {
    cryptoSpy.mockRestore();
    mockLocalStorage.clear();
  });

  describe('getUserId', () => {
    it('should generate a new UUID if none exists', () => {
      const mockUuid = '123e4567-e89b-12d3-a456-426614174000';
      cryptoSpy.mockReturnValue(mockUuid);

      const userId = getUserId();

      expect(userId).toBe(mockUuid);
      expect(cryptoSpy).toHaveBeenCalledOnce();
      expect(mockLocalStorage.getItem('hotnote_user_id')).toBe(mockUuid);
    });

    it('should return existing UUID if already set', () => {
      const existingUuid = '987e6543-e21b-43d2-a654-426614174999';
      mockLocalStorage.setItem('hotnote_user_id', existingUuid);

      const userId = getUserId();

      expect(userId).toBe(existingUuid);
      expect(cryptoSpy).not.toHaveBeenCalled();
    });

    it('should persist UUID across multiple calls', () => {
      const mockUuid = 'aaaabbbb-cccc-dddd-eeee-ffffffffffff';
      cryptoSpy.mockReturnValue(mockUuid);

      const userId1 = getUserId();
      const userId2 = getUserId();
      const userId3 = getUserId();

      expect(userId1).toBe(mockUuid);
      expect(userId2).toBe(mockUuid);
      expect(userId3).toBe(mockUuid);
      expect(cryptoSpy).toHaveBeenCalledOnce();
    });

    it('should log when generating new user ID', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockUuid = 'test-uuid-123';
      cryptoSpy.mockReturnValue(mockUuid);

      getUserId();

      expect(consoleSpy).toHaveBeenCalledWith('Generated new user ID:', mockUuid);
      consoleSpy.mockRestore();
    });
  });

  describe('getUserDisplayName', () => {
    it('should return "Anonymous User" by default', () => {
      const displayName = getUserDisplayName();

      expect(displayName).toBe('Anonymous User');
    });

    it('should return stored display name if set', () => {
      mockLocalStorage.setItem('hotnote_user_name', 'John Doe');

      const displayName = getUserDisplayName();

      expect(displayName).toBe('John Doe');
    });

    it('should handle empty string as "Anonymous User"', () => {
      mockLocalStorage.setItem('hotnote_user_name', '');

      const displayName = getUserDisplayName();

      // Empty string is falsy, so should return 'Anonymous User'
      expect(displayName).toBe('Anonymous User');
    });
  });

  describe('setUserDisplayName', () => {
    it('should save display name to localStorage', () => {
      setUserDisplayName('Alice');

      expect(mockLocalStorage.getItem('hotnote_user_name')).toBe('Alice');
    });

    it('should trim whitespace from display name', () => {
      setUserDisplayName('  Bob Smith  ');

      expect(mockLocalStorage.getItem('hotnote_user_name')).toBe('Bob Smith');
    });

    it('should not save if name is null', () => {
      setUserDisplayName(null);

      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();
    });

    it('should not save if name is undefined', () => {
      setUserDisplayName(undefined);

      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();
    });

    it('should not save if name is not a string', () => {
      setUserDisplayName(123);
      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();

      setUserDisplayName({ name: 'test' });
      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();
    });

    it('should not save empty string after trimming', () => {
      setUserDisplayName('   ');

      // Empty string after trim should not be saved
      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();
    });
  });

  describe('isCurrentUser', () => {
    it('should return true for current user ID', () => {
      const mockUuid = 'current-user-uuid';
      cryptoSpy.mockReturnValue(mockUuid);

      // Generate the current user ID
      getUserId();

      const result = isCurrentUser(mockUuid);

      expect(result).toBe(true);
    });

    it('should return false for different user ID', () => {
      const mockUuid = 'current-user-uuid';
      cryptoSpy.mockReturnValue(mockUuid);

      // Generate the current user ID
      getUserId();

      const result = isCurrentUser('different-user-uuid');

      expect(result).toBe(false);
    });

    it('should work with existing user ID', () => {
      const existingUuid = 'existing-user-123';
      mockLocalStorage.setItem('hotnote_user_id', existingUuid);

      expect(isCurrentUser(existingUuid)).toBe(true);
      expect(isCurrentUser('someone-else')).toBe(false);
    });
  });

  describe('getUserInfo', () => {
    it('should return user info object with id and displayName', () => {
      const mockUuid = 'test-user-uuid';
      cryptoSpy.mockReturnValue(mockUuid);

      const userInfo = getUserInfo();

      expect(userInfo).toEqual({
        id: mockUuid,
        displayName: 'Anonymous User',
      });
    });

    it('should return custom display name if set', () => {
      const mockUuid = 'test-user-uuid';
      cryptoSpy.mockReturnValue(mockUuid);
      mockLocalStorage.setItem('hotnote_user_name', 'Jane Developer');

      const userInfo = getUserInfo();

      expect(userInfo).toEqual({
        id: mockUuid,
        displayName: 'Jane Developer',
      });
    });

    it('should return existing user info', () => {
      mockLocalStorage.setItem('hotnote_user_id', 'existing-id');
      mockLocalStorage.setItem('hotnote_user_name', 'Existing User');

      const userInfo = getUserInfo();

      expect(userInfo).toEqual({
        id: 'existing-id',
        displayName: 'Existing User',
      });
    });
  });

  describe('clearUserData', () => {
    it('should remove user ID from localStorage', () => {
      mockLocalStorage.setItem('hotnote_user_id', 'test-id');

      clearUserData();

      expect(mockLocalStorage.getItem('hotnote_user_id')).toBeNull();
    });

    it('should remove display name from localStorage', () => {
      mockLocalStorage.setItem('hotnote_user_name', 'Test User');

      clearUserData();

      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();
    });

    it('should remove both user ID and display name', () => {
      mockLocalStorage.setItem('hotnote_user_id', 'test-id');
      mockLocalStorage.setItem('hotnote_user_name', 'Test User');

      clearUserData();

      expect(mockLocalStorage.getItem('hotnote_user_id')).toBeNull();
      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();
    });

    it('should log when clearing user data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      clearUserData();

      expect(consoleSpy).toHaveBeenCalledWith('User data cleared');
      consoleSpy.mockRestore();
    });

    it('should allow generating new ID after clearing', () => {
      const firstUuid = 'first-uuid';
      const secondUuid = 'second-uuid';

      cryptoSpy.mockReturnValueOnce(firstUuid);
      getUserId();
      expect(getUserId()).toBe(firstUuid);

      clearUserData();

      cryptoSpy.mockReturnValueOnce(secondUuid);
      const newId = getUserId();

      expect(newId).toBe(secondUuid);
      expect(newId).not.toBe(firstUuid);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete user lifecycle', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockUuid = 'lifecycle-test-uuid';
      cryptoSpy.mockReturnValue(mockUuid);

      // Generate user
      const userId = getUserId();
      expect(userId).toBe(mockUuid);
      expect(isCurrentUser(userId)).toBe(true);

      // Set display name
      setUserDisplayName('Test User');
      expect(getUserDisplayName()).toBe('Test User');

      // Get user info
      const userInfo = getUserInfo();
      expect(userInfo).toEqual({
        id: mockUuid,
        displayName: 'Test User',
      });

      // Clear data
      clearUserData();
      expect(mockLocalStorage.getItem('hotnote_user_id')).toBeNull();
      expect(mockLocalStorage.getItem('hotnote_user_name')).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should handle concurrent operations', () => {
      const mockUuid = 'concurrent-uuid';
      cryptoSpy.mockReturnValue(mockUuid);

      // Multiple simultaneous getUserId calls should all return same ID
      const ids = [getUserId(), getUserId(), getUserId()];

      expect(new Set(ids).size).toBe(1);
      expect(ids[0]).toBe(mockUuid);
      expect(cryptoSpy).toHaveBeenCalledOnce();
    });
  });
});
