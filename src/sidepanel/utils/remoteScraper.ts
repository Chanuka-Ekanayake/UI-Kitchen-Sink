import { ComponentBlock } from '../../shared/types';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Extracts JSON blocks following a specific tag. 
 * Robustly parses nested braces by ignoring characters inside string literals.
 */
function extractJsonBlocks(text: string, tag: string): string[] {
  const blocks: string[] = [];
  let startIndex = 0;

  while (true) {
    const tagIndex = text.indexOf(tag, startIndex);
    if (tagIndex === -1) break;

    const curlyStart = text.indexOf('{', tagIndex + tag.length);
    if (curlyStart === -1) {
      startIndex = tagIndex + tag.length;
      continue;
    }

    let braceCount = 0;
    let inString = false;
    let escape = false;
    let endIndex = -1;

    for (let i = curlyStart; i < text.length; i++) {
      const char = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
      }
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex !== -1) {
      blocks.push(text.slice(curlyStart, endIndex + 1));
      startIndex = endIndex + 1;
    } else {
      // Malformed or incomplete braces, move past the tag
      startIndex = tagIndex + tag.length;
    }
  }
  return blocks;
}

export async function syncRemoteComponents(url: string): Promise<{ components: ComponentBlock[], errors: any[] }> {
  try {
    const urlObj = new URL(url);
  } catch (e) {
    throw new Error('Invalid URL format');
  }

  // --- Auth-Gate Simulation ---
  if (url === 'http://localhost:5173/auth-test-guide.md' || url.includes('/auth-test-guide.md')) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(['mock_auth_active']);
      if (!data.mock_auth_active) {
        throw new AuthError(`Authentication Required: Please open this URL in a new tab to log in and then try again.`);
      }
    } else {
      console.warn('Cannot verify Auth-Gate: chrome.storage.local API is not available.');
    }
  }
  // -----------------------------

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err: any) {
    // If fetch itself throws, it's typically CORS or a complete network failure
    throw new NetworkError(`Network or CORS issue. You may need to grant Host Permissions for this domain.`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new AuthError(`Authentication Required: Please open this URL in a new tab to log in and then try again.`);
  }

  if (response.status === 404) {
    throw new NotFoundError(`Style Guide not found at the provided URL.`);
  }

  if (!response.ok) {
    throw new NetworkError(`Failed to fetch from remote URL: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const dataTag = '!!UI-VAL-DATA!!';
  
  const jsonBlocks = extractJsonBlocks(text, dataTag);
  const components: ComponentBlock[] = [];
  const errors: any[] = [];

  for (const jsonStr of jsonBlocks) {
    try {
      const parsed = JSON.parse(jsonStr) as ComponentBlock;
      // Guarantee required fields exist
      if (!parsed.name || (!parsed.htmlTag && !parsed.cssClass && !parsed.cssId)) {
         throw new Error('Component missing required selector fields.');
      }
      components.push({
        ...parsed,
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(),
        isEnabled: parsed.isEnabled ?? true,
      });
    } catch (e) {
      errors.push(e);
      console.warn("Malformed JSON in remote block:", jsonStr.substring(0, 50) + "...");
    }
  }

  return { components, errors };
}
