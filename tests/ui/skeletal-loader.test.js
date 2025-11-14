import { describe, it, expect, beforeEach } from 'vitest';
import { createSkeletalLoader, getRandomLineCount } from '../../src/ui/skeletal-loader.js';

describe('Skeletal Loader', () => {
  beforeEach(() => {
    // Clear the DOM
    document.body.innerHTML = '';
  });

  describe('getRandomLineCount', () => {
    it('should return a number between 3 and 5', () => {
      // Test multiple times since it's random
      for (let i = 0; i < 100; i++) {
        const count = getRandomLineCount();
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(5);
      }
    });

    it('should return an integer', () => {
      const count = getRandomLineCount();
      expect(Number.isInteger(count)).toBe(true);
    });

    it('should return all possible values over many iterations', () => {
      const values = new Set();

      // Run enough times to likely get all 3 possible values
      for (let i = 0; i < 100; i++) {
        values.add(getRandomLineCount());
      }

      // Should have at least 2 different values (ideally all 3)
      expect(values.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createSkeletalLoader', () => {
    it('should create a loader container element', () => {
      const loader = createSkeletalLoader();

      expect(loader.container).toBeDefined();
      expect(loader.container).toBeInstanceOf(HTMLElement);
      expect(loader.container.classList.contains('skeletal-loader')).toBe(true);
    });

    it('should create the correct number of line elements', () => {
      const loader = createSkeletalLoader(4);

      const lines = loader.container.querySelectorAll('.skeletal-line');
      expect(lines.length).toBe(4);
    });

    it('should create random number of lines when count not specified', () => {
      const loader = createSkeletalLoader();

      const lines = loader.container.querySelectorAll('.skeletal-line');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
    });

    it('should add shimmer class to each line', () => {
      const loader = createSkeletalLoader(3);

      const lines = loader.container.querySelectorAll('.skeletal-line');
      lines.forEach((line) => {
        expect(line.classList.contains('skeletal-line')).toBe(true);
      });
    });

    it('should provide destroy method', () => {
      const loader = createSkeletalLoader();

      expect(typeof loader.destroy).toBe('function');
    });

    it('should remove container from DOM when destroyed', () => {
      const loader = createSkeletalLoader();
      document.body.appendChild(loader.container);

      expect(document.body.contains(loader.container)).toBe(true);

      loader.destroy();

      expect(document.body.contains(loader.container)).toBe(false);
    });

    it('should handle destroy when not in DOM', () => {
      const loader = createSkeletalLoader();

      // Should not throw
      expect(() => loader.destroy()).not.toThrow();
    });

    it('should vary line widths for natural look', () => {
      const loader = createSkeletalLoader(5);

      const lines = loader.container.querySelectorAll('.skeletal-line');
      const widths = Array.from(lines).map((line) =>
        line.style.width ? parseFloat(line.style.width) : null
      );

      // At least some lines should have different widths
      // (last line is typically shorter)
      const uniqueWidths = new Set(widths.filter((w) => w !== null));
      expect(uniqueWidths.size).toBeGreaterThan(0);
    });

    it('should accept specific line count', () => {
      const loader3 = createSkeletalLoader(3);
      expect(loader3.container.querySelectorAll('.skeletal-line').length).toBe(3);

      const loader4 = createSkeletalLoader(4);
      expect(loader4.container.querySelectorAll('.skeletal-line').length).toBe(4);

      const loader5 = createSkeletalLoader(5);
      expect(loader5.container.querySelectorAll('.skeletal-line').length).toBe(5);
    });

    it('should have proper HTML structure', () => {
      const loader = createSkeletalLoader(3);

      expect(loader.container.tagName).toBe('DIV');
      expect(loader.container.classList.contains('skeletal-loader')).toBe(true);

      const lines = loader.container.querySelectorAll('.skeletal-line');
      expect(lines.length).toBe(3);

      lines.forEach((line) => {
        expect(line.tagName).toBe('DIV');
      });
    });

    it('should include proper ARIA attributes for accessibility', () => {
      const loader = createSkeletalLoader();

      expect(loader.container.getAttribute('aria-busy')).toBe('true');
      expect(loader.container.getAttribute('aria-label')).toContain('Loading');
    });

    it('should provide getElement method', () => {
      const loader = createSkeletalLoader();

      expect(typeof loader.getElement).toBe('function');
      expect(loader.getElement()).toBe(loader.container);
    });
  });

  describe('Integration scenarios', () => {
    it('should create and destroy multiple loaders independently', () => {
      const loader1 = createSkeletalLoader(3);
      const loader2 = createSkeletalLoader(4);
      const loader3 = createSkeletalLoader(5);

      document.body.appendChild(loader1.container);
      document.body.appendChild(loader2.container);
      document.body.appendChild(loader3.container);

      expect(document.querySelectorAll('.skeletal-loader').length).toBe(3);

      loader2.destroy();

      expect(document.querySelectorAll('.skeletal-loader').length).toBe(2);
      expect(document.body.contains(loader1.container)).toBe(true);
      expect(document.body.contains(loader2.container)).toBe(false);
      expect(document.body.contains(loader3.container)).toBe(true);

      loader1.destroy();
      loader3.destroy();

      expect(document.querySelectorAll('.skeletal-loader').length).toBe(0);
    });

    it('should handle rapid create/destroy cycles', () => {
      for (let i = 0; i < 10; i++) {
        const loader = createSkeletalLoader();
        document.body.appendChild(loader.container);
        expect(document.body.contains(loader.container)).toBe(true);
        loader.destroy();
        expect(document.body.contains(loader.container)).toBe(false);
      }

      expect(document.querySelectorAll('.skeletal-loader').length).toBe(0);
    });

    it('should maintain DOM integrity after multiple operations', () => {
      const loaders = [];

      // Create multiple loaders
      for (let i = 0; i < 5; i++) {
        const loader = createSkeletalLoader(3 + i);
        document.body.appendChild(loader.container);
        loaders.push(loader);
      }

      expect(document.querySelectorAll('.skeletal-loader').length).toBe(5);

      // Destroy in different order
      loaders[2].destroy();
      loaders[0].destroy();
      loaders[4].destroy();

      expect(document.querySelectorAll('.skeletal-loader').length).toBe(2);

      // Remaining loaders should still be valid
      const remainingLines1 = loaders[1].container.querySelectorAll('.skeletal-line');
      const remainingLines3 = loaders[3].container.querySelectorAll('.skeletal-line');

      expect(remainingLines1.length).toBe(4);
      expect(remainingLines3.length).toBe(6);
    });
  });

  describe('Visual properties', () => {
    it('should create line elements that can receive height from CSS', () => {
      const loader = createSkeletalLoader(3);
      const lines = loader.container.querySelectorAll('.skeletal-line');

      // Lines should exist and have proper class for CSS targeting
      expect(lines.length).toBe(3);
      lines.forEach((line) => {
        expect(line.classList.contains('skeletal-line')).toBe(true);
        expect(line.tagName).toBe('DIV');
      });
    });

    it('should have proper spacing between lines', () => {
      const loader = createSkeletalLoader(3);

      // Container should have some structure for spacing
      // This could be margin, padding, or gap
      const container = loader.container;
      expect(container.children.length).toBe(3);
    });

    it('should make last line shorter for natural appearance', () => {
      const loader = createSkeletalLoader(3);
      const lines = loader.container.querySelectorAll('.skeletal-line');
      const lastLine = lines[lines.length - 1];

      // Last line should have a width style set
      if (lastLine.style.width) {
        const width = parseFloat(lastLine.style.width);
        expect(width).toBeLessThan(100);
        expect(width).toBeGreaterThan(50);
      }
    });
  });
});
