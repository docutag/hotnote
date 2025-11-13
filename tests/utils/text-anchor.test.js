import { describe, it, expect } from 'vitest';
import { createAnchor, findAnchorPosition } from '../../src/utils/text-anchor.js';

describe('Text Anchor', () => {
  describe('createAnchor', () => {
    it('should create anchor with prefix, exact, and suffix', () => {
      const doc = 'Hello world, this is a test document with some content.';
      const from = 13; // 'this'
      const to = 17;

      const anchor = createAnchor(doc, from, to);

      expect(anchor).toHaveProperty('prefix');
      expect(anchor).toHaveProperty('exact', 'this');
      expect(anchor).toHaveProperty('suffix');
    });

    it('should capture context before and after selection', () => {
      const doc = 'The quick brown fox jumps over the lazy dog.';
      const from = 16; // 'fox'
      const to = 19;

      const anchor = createAnchor(doc, from, to);

      expect(anchor.exact).toBe('fox');
      expect(anchor.prefix).toBe('The quick brown ');
      expect(anchor.suffix).toBe(' jumps over the lazy dog.');
    });

    it('should handle selections at start of document', () => {
      const doc = 'Start of document with more text.';
      const from = 0;
      const to = 5; // 'Start'

      const anchor = createAnchor(doc, from, to);

      expect(anchor.exact).toBe('Start');
      expect(anchor.prefix).toBe('');
      expect(anchor.suffix).toBe(' of document with more text.');
    });

    it('should handle selections at end of document', () => {
      const doc = 'Some text at the end.';
      const from = 17; // 'end.'
      const to = 21;

      const anchor = createAnchor(doc, from, to);

      expect(anchor.exact).toBe('end.');
      expect(anchor.suffix).toBe('');
    });

    it('should limit prefix and suffix to reasonable length', () => {
      const longText = 'A'.repeat(100) + 'target' + 'B'.repeat(100);
      const from = 100;
      const to = 106;

      const anchor = createAnchor(longText, from, to);

      expect(anchor.exact).toBe('target');
      expect(anchor.prefix.length).toBeLessThanOrEqual(32);
      expect(anchor.suffix.length).toBeLessThanOrEqual(32);
    });

    it('should handle multiline selections', () => {
      const doc = 'Line 1\nLine 2\nLine 3\nLine 4';
      const from = 7; // Start of 'Line 2'
      const to = 20; // End of 'Line 3'

      const anchor = createAnchor(doc, from, to);

      expect(anchor.exact).toBe('Line 2\nLine 3');
      expect(anchor.prefix).toContain('Line 1');
      expect(anchor.suffix).toContain('Line 4');
    });

    it('should handle empty selections', () => {
      const doc = 'Some text here.';
      const from = 5;
      const to = 5; // Empty selection (cursor position)

      const anchor = createAnchor(doc, from, to);

      expect(anchor.exact).toBe('');
      expect(anchor.prefix).toBeTruthy();
      expect(anchor.suffix).toBeTruthy();
    });

    it('should handle selections with special characters', () => {
      const doc = 'Code: function() { return "value"; }';
      const from = 6; // 'function() { return "value"; }'
      const to = 36;

      const anchor = createAnchor(doc, from, to);

      expect(anchor.exact).toBe('function() { return "value"; }');
    });
  });

  describe('findAnchorPosition', () => {
    it('should find exact match in unchanged document', () => {
      const doc = 'Hello world, this is a test document.';
      const anchor = {
        prefix: 'world, ',
        exact: 'this',
        suffix: ' is a',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(result.from).toBe(13);
      expect(result.to).toBe(17);
    });

    it('should find text even when prefix content changes', () => {
      // Original: 'Hello world, this is a test.'
      // Modified: 'Greetings world, this is a test.'
      const doc = 'Greetings world, this is a test.';
      const anchor = {
        prefix: 'Hello world, ', // Old prefix
        exact: 'this',
        suffix: ' is a',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(doc.substring(result.from, result.to)).toBe('this');
    });

    it('should find text even when suffix content changes', () => {
      const doc = 'Hello world, this has changed completely.';
      const anchor = {
        prefix: 'world, ',
        exact: 'this',
        suffix: ' is a test', // Old suffix
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(doc.substring(result.from, result.to)).toBe('this');
    });

    it('should handle case where exact text appears multiple times', () => {
      const doc = 'test one test two test three';
      const anchor = {
        prefix: 'one ',
        exact: 'test',
        suffix: ' two',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      // Should find the second 'test'
      expect(doc.substring(result.from, result.to)).toBe('test');
      expect(doc.substring(result.from - 4, result.from)).toBe('one ');
    });

    it('should return null if exact text not found', () => {
      const doc = 'This text has been completely rewritten.';
      const anchor = {
        prefix: 'Hello ',
        exact: 'original content',
        suffix: ' more text',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeNull();
    });

    it('should handle multiline text', () => {
      const doc = 'Line 1\nLine 2\nLine 3\nLine 4';
      const anchor = {
        prefix: 'Line 1\n',
        exact: 'Line 2\nLine 3',
        suffix: '\nLine 4',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(doc.substring(result.from, result.to)).toBe('Line 2\nLine 3');
    });

    it('should handle text at document start', () => {
      const doc = 'Start text and more content.';
      const anchor = {
        prefix: '',
        exact: 'Start',
        suffix: ' text',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(result.from).toBe(0);
      expect(result.to).toBe(5);
    });

    it('should handle text at document end', () => {
      const doc = 'Some content at the end.';
      const anchor = {
        prefix: 'the ',
        exact: 'end.',
        suffix: '',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(doc.substring(result.from, result.to)).toBe('end.');
      expect(result.to).toBe(doc.length);
    });

    it('should prioritize matches with matching context', () => {
      // Document with 'foo' appearing 3 times
      const doc = 'prefix1 foo suffix1, prefix2 foo suffix2, prefix3 foo suffix3';
      const anchor = {
        prefix: 'prefix2 ',
        exact: 'foo',
        suffix: ' suffix2',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      // Should find the second 'foo' (with prefix2)
      const actualPrefix = doc.substring(Math.max(0, result.from - 8), result.from);
      expect(actualPrefix).toBe('prefix2 ');
    });

    it('should handle fuzzy matching when context partially matches', () => {
      // Original context: 'quick brown'
      // New context: 'fast brown' (similar but not exact)
      const doc = 'The fast brown fox jumps.';
      const anchor = {
        prefix: 'quick ',
        exact: 'brown',
        suffix: ' fox',
      };

      const result = findAnchorPosition(doc, anchor);

      // Should still find 'brown' based on suffix match
      expect(result).toBeTruthy();
      expect(doc.substring(result.from, result.to)).toBe('brown');
    });

    it('should return null for empty document', () => {
      const doc = '';
      const anchor = {
        prefix: 'some',
        exact: 'text',
        suffix: 'here',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeNull();
    });

    it('should handle special regex characters in text', () => {
      const doc = 'function test() { return [1, 2, 3]; }';
      const anchor = {
        prefix: '{ ',
        exact: 'return [1, 2, 3];',
        suffix: ' }',
      };

      const result = findAnchorPosition(doc, anchor);

      expect(result).toBeTruthy();
      expect(doc.substring(result.from, result.to)).toBe('return [1, 2, 3];');
    });
  });

  describe('integration scenarios', () => {
    it('should handle create and find cycle', () => {
      const originalDoc = 'The quick brown fox jumps over the lazy dog.';
      const from = 16;
      const to = 19;

      // Create anchor
      const anchor = createAnchor(originalDoc, from, to);

      // Find in same document
      const result = findAnchorPosition(originalDoc, anchor);

      expect(result).toBeTruthy();
      expect(result.from).toBe(from);
      expect(result.to).toBe(to);
      expect(originalDoc.substring(result.from, result.to)).toBe('fox');
    });

    it('should survive text insertions before selection', () => {
      const originalDoc = 'The quick brown fox jumps.';
      const from = 16; // 'fox'
      const to = 19;

      const anchor = createAnchor(originalDoc, from, to);

      // Insert text before the selection
      const modifiedDoc = 'INSERTED TEXT The quick brown fox jumps.';

      const result = findAnchorPosition(modifiedDoc, anchor);

      expect(result).toBeTruthy();
      expect(modifiedDoc.substring(result.from, result.to)).toBe('fox');
      // Position should have shifted
      expect(result.from).not.toBe(from);
    });

    it('should survive text deletions before selection', () => {
      const originalDoc = 'The quick brown fox jumps over the lazy dog.';
      const from = 16; // 'fox'
      const to = 19;

      const anchor = createAnchor(originalDoc, from, to);

      // Delete 'quick ' from the document
      const modifiedDoc = 'The brown fox jumps over the lazy dog.';

      const result = findAnchorPosition(modifiedDoc, anchor);

      expect(result).toBeTruthy();
      expect(modifiedDoc.substring(result.from, result.to)).toBe('fox');
    });

    it('should survive text modifications in surrounding content', () => {
      const originalDoc = 'Original prefix TARGET_TEXT original suffix';
      const from = 16;
      const to = 27;

      const anchor = createAnchor(originalDoc, from, to);

      // Modify prefix and suffix
      const modifiedDoc = 'Modified prefix TARGET_TEXT modified suffix';

      const result = findAnchorPosition(modifiedDoc, anchor);

      expect(result).toBeTruthy();
      expect(modifiedDoc.substring(result.from, result.to)).toBe('TARGET_TEXT');
    });

    it('should handle multiple anchors in same document', () => {
      const doc = 'First section with text. Second section with text. Third section.';

      const anchor1 = createAnchor(doc, 0, 13); // 'First section'
      const anchor2 = createAnchor(doc, 25, 39); // 'Second section'
      const anchor3 = createAnchor(doc, 51, 64); // 'Third section'

      const result1 = findAnchorPosition(doc, anchor1);
      const result2 = findAnchorPosition(doc, anchor2);
      const result3 = findAnchorPosition(doc, anchor3);

      expect(doc.substring(result1.from, result1.to)).toBe('First section');
      expect(doc.substring(result2.from, result2.to)).toBe('Second section');
      expect(doc.substring(result3.from, result3.to)).toBe('Third section');
    });
  });
});
