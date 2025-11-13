/**
 * Text Anchor Utility
 *
 * Provides content-based text anchoring for comments that survive document edits.
 * Uses surrounding text context to re-locate selections even when document content changes.
 */

// Maximum length for prefix and suffix context
const CONTEXT_LENGTH = 32;

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for use in RegExp
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a text anchor from a document position
 * @param {string} doc - The full document text
 * @param {number} from - Start position of selection
 * @param {number} to - End position of selection
 * @returns {{prefix: string, exact: string, suffix: string}} Anchor object
 */
export function createAnchor(doc, from, to) {
  // Extract the exact selected text
  const exact = doc.substring(from, to);

  // Extract prefix (text before selection, limited to CONTEXT_LENGTH)
  const prefixStart = Math.max(0, from - CONTEXT_LENGTH);
  const prefix = doc.substring(prefixStart, from);

  // Extract suffix (text after selection, limited to CONTEXT_LENGTH)
  const suffixEnd = Math.min(doc.length, to + CONTEXT_LENGTH);
  const suffix = doc.substring(to, suffixEnd);

  return {
    prefix,
    exact,
    suffix,
  };
}

/**
 * Find the position of an anchor in a document
 * Uses exact text matching with context-based disambiguation
 * @param {string} doc - The document text to search in
 * @param {{prefix: string, exact: string, suffix: string}} anchor - The anchor to find
 * @returns {{from: number, to: number}|null} Position or null if not found
 */
export function findAnchorPosition(doc, anchor) {
  const { prefix, exact, suffix } = anchor;

  // Return null for empty document or if exact text is missing
  if (!doc || doc.length === 0) {
    return null;
  }

  // Escape special regex characters
  const escapedExact = escapeRegex(exact);

  // Find all occurrences of the exact text
  const exactRegex = new RegExp(escapedExact, 'g');
  const matches = [];
  let match;

  while ((match = exactRegex.exec(doc)) !== null) {
    matches.push({
      from: match.index,
      to: match.index + exact.length,
    });
  }

  // No matches found
  if (matches.length === 0) {
    return null;
  }

  // Single match - return it
  if (matches.length === 1) {
    return matches[0];
  }

  // Multiple matches - use context to disambiguate
  // Score each match based on how well prefix and suffix match
  const scoredMatches = matches.map((pos) => {
    let score = 0;

    // Extract actual prefix and suffix from document
    const actualPrefixStart = Math.max(0, pos.from - CONTEXT_LENGTH);
    const actualPrefix = doc.substring(actualPrefixStart, pos.from);

    const actualSuffixEnd = Math.min(doc.length, pos.to + CONTEXT_LENGTH);
    const actualSuffix = doc.substring(pos.to, actualSuffixEnd);

    // Score based on suffix match (more reliable for forward-looking context)
    if (suffix && actualSuffix.startsWith(suffix)) {
      score += 100; // Exact suffix match
    } else if (suffix && suffix.length > 0) {
      // Partial suffix match - count matching characters
      const minLen = Math.min(suffix.length, actualSuffix.length);
      for (let i = 0; i < minLen; i++) {
        if (suffix[i] === actualSuffix[i]) {
          score += 1;
        } else {
          break;
        }
      }
    }

    // Score based on prefix match
    if (prefix && actualPrefix.endsWith(prefix)) {
      score += 50; // Exact prefix match
    } else if (prefix && prefix.length > 0) {
      // Partial prefix match - count matching characters from end
      const minLen = Math.min(prefix.length, actualPrefix.length);
      for (let i = 1; i <= minLen; i++) {
        if (prefix[prefix.length - i] === actualPrefix[actualPrefix.length - i]) {
          score += 0.5;
        } else {
          break;
        }
      }
    }

    return { ...pos, score };
  });

  // Sort by score (highest first) and return the best match
  scoredMatches.sort((a, b) => b.score - a.score);

  // Return the match with the highest score
  const bestMatch = scoredMatches[0];
  return {
    from: bestMatch.from,
    to: bestMatch.to,
  };
}
