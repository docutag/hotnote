/**
 * AI Service
 * Handles communication with Ollama API for text improvement
 */

import { getSettings } from '../state/settings-manager.js';

/**
 * Extract comments from text
 * Supports:
 * - Single-line comments: // comment
 * - Multi-line comments: /* comment *\/
 * - HTML/Markdown comments: <!-- comment -->
 */
export function extractCommentsFromText(text) {
  const comments = [];
  let textWithoutComments = text;

  // Match single-line comments (// ...)
  const singleLineRegex = /\/\/\s*(.+?)$/gm;
  const singleLineMatches = text.matchAll(singleLineRegex);
  for (const match of singleLineMatches) {
    comments.push(match[1].trim());
  }

  // Match multi-line comments (/* ... */)
  const multiLineRegex = /\/\*\s*([\s\S]*?)\s*\*\//g;
  const multiLineMatches = text.matchAll(multiLineRegex);
  for (const match of multiLineMatches) {
    comments.push(match[1].trim());
  }

  // Match HTML/Markdown comments (<!-- ... -->)
  const htmlCommentRegex = /<!--\s*([\s\S]*?)\s*-->/g;
  const htmlMatches = text.matchAll(htmlCommentRegex);
  for (const match of htmlMatches) {
    comments.push(match[1].trim());
  }

  // Remove all comments from text
  textWithoutComments = textWithoutComments
    .replace(singleLineRegex, '')
    .replace(multiLineRegex, '')
    .replace(htmlCommentRegex, '');

  return {
    comments,
    textWithoutComments,
  };
}

/**
 * Build prompt for Ollama
 */
export function buildPrompt(text, comments, systemPrompt) {
  let prompt = '';

  // Add system prompt if provided
  if (systemPrompt) {
    prompt += `${systemPrompt}\n\n`;
  }

  // Add instructions
  if (comments.length > 0) {
    prompt += 'Instructions:\n';
    comments.forEach((comment, index) => {
      prompt += `${index + 1}. ${comment}\n`;
    });
    prompt += '\n';
  } else {
    prompt += 'Please improve this text while maintaining its original meaning and tone.\n\n';
  }

  // Add text to improve
  prompt += `Text to improve:\n${text}`;

  return prompt;
}

/**
 * Call Ollama API
 */
export async function callOllama(endpoint, model, prompt, temperature, topP, timeout = 30000) {
  /* global AbortController */
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Normalize endpoint - remove trailing slashes
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');

  try {
    const response = await fetch(`${normalizedEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature,
          top_p: topP,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Provide more helpful error messages
      if (response.status === 404) {
        throw new Error(
          `Model "${model}" not found. Please check that the model is installed on your Ollama server (run: ollama list)`
        );
      }
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Ollama server took too long to respond');
    }

    // Network errors (server not reachable)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to Ollama server at ${normalizedEndpoint}. Please verify the server is running and the endpoint URL is correct.`
      );
    }

    throw error;
  }
}

/**
 * Parse streaming response from Ollama
 * Note: This is for future streaming support
 */
export function parseStreamingResponse(chunks) {
  const lines = chunks.split('\n').filter((line) => line.trim() !== '');

  let result = '';

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.response) {
        result += parsed.response;
      }
    } catch (_e) {
      // Skip malformed JSON lines
      continue;
    }
  }

  return result;
}

/**
 * Improve text using AI
 * This is the main function that orchestrates the AI improvement workflow
 */
export async function improveText(text) {
  // Get settings
  const settings = getSettings();
  const { endpoint, model, systemPrompt, temperature, topP } = settings.ollama;

  // Extract comments from text
  const { comments, textWithoutComments } = extractCommentsFromText(text);

  // Build prompt
  const prompt = buildPrompt(textWithoutComments, comments, systemPrompt);

  // Call Ollama API
  const improvedText = await callOllama(endpoint, model, prompt, temperature, topP);

  return improvedText;
}
