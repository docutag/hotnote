/**
 * Skeletal Loader
 * Creates an animated placeholder loading state with random line counts
 */

/**
 * Get random line count between 3 and 5
 */
export function getRandomLineCount() {
  return Math.floor(Math.random() * 3) + 3; // Random number between 3-5
}

/**
 * Create skeletal loader
 * @param {number} lineCount - Optional specific line count (3-5). If not provided, random.
 * @returns {Object} Loader object with container, destroy method, and getElement method
 */
export function createSkeletalLoader(lineCount) {
  // Use provided line count or random
  const count = lineCount !== undefined ? lineCount : getRandomLineCount();

  // Create container
  const container = document.createElement('div');
  container.classList.add('skeletal-loader');
  container.setAttribute('aria-busy', 'true');
  container.setAttribute('aria-label', 'Loading AI response');

  // Create skeletal lines
  for (let i = 0; i < count; i++) {
    const line = document.createElement('div');
    line.classList.add('skeletal-line');

    // Make last line shorter for more natural appearance
    if (i === count - 1) {
      const randomWidth = Math.floor(Math.random() * 30) + 60; // 60-90%
      line.style.width = `${randomWidth}%`;
    }

    container.appendChild(line);
  }

  /**
   * Destroy loader and remove from DOM
   */
  function destroy() {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  /**
   * Get the loader container element
   */
  function getElement() {
    return container;
  }

  return {
    container,
    destroy,
    getElement,
  };
}
