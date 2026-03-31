// utils/kbbiLoader.js — Dynamic KBBI file loader
// Automatically detects and loads all KBBI JSON parts
// Merges them into a single object for seamless use

/**
 * Dynamically load all KBBI JSON files matching pattern
 * @param {string} basePath - Base path (default: './')
 * @param {string} prefix - File prefix (default: 'kbbi')
 * @returns {Promise<Object>} Merged KBBI data object
 */
export async function loadAllKBBI(basePath = './', prefix = 'kbbi') {
  // Pattern: kbbi_v_part1_part1.json, kbbi_v_part1_part2.json, etc.
  // We need to find all files matching: ${prefix}*.json
  
  const mergedData = {};
  const errors = [];
  
  try {
    // Since we can't use fs in browser/Cloudflare, we'll use fetch with known patterns
    // Try to load files based on common naming conventions
    
    // Strategy: Try fetching files with incremental part numbers
    let totalLoaded = 0;
    let hasMore = true;
    let partIndex = 1;
    
    // We'll try up to 20 parts per original file (should be more than enough)
    const maxPartsPerFile = 20;
    const maxOriginalFiles = 10; // Support up to 10 original KBBI files
    
    for (let fileNum = 1; fileNum <= maxOriginalFiles; fileNum++) {
      for (let partNum = 1; partNum <= maxPartsPerFile; partNum++) {
        // Try pattern: kbbi_v_part{fileNum}_part{partNum}.json
        const filename = `${prefix}_v_part${fileNum}_part${partNum}.json`;
        const url = basePath.endsWith('/') ? `${basePath}${filename}` : `${basePath}/${filename}`;
        
        try {
          const response = await fetch(url);
          if (!response.ok) {
            // File doesn't exist, move to next original file
            break;
          }
          
          const data = await response.json();
          Object.assign(mergedData, data);
          totalLoaded++;
          
          if (totalLoaded % 5 === 0) {
            console.log(`[KBBI Loader] Loaded ${totalLoaded} parts so far...`);
          }
        } catch (err) {
          // File not found or error, try next part number
          break;
        }
      }
    }
    
    if (totalLoaded === 0) {
      console.warn('[KBBI Loader] No KBBI files found. Using fallback word list only.');
    } else {
      console.log(`[KBBI Loader] ✅ Successfully loaded ${totalLoaded} parts with ${Object.keys(mergedData).toLocaleString('id-ID')} entries`);
    }
    
  } catch (error) {
    console.error('[KBBI Loader] Error loading KBBI files:', error);
    errors.push(error.message);
  }
  
  return {
    data: mergedData,
    entryCount: Object.keys(mergedData).length,
    errors
  };
}

/**
 * Load KBBI files from a predefined list of URLs
 * @param {string[]} fileUrls - Array of file URLs to load
 * @returns {Promise<Object>} Merged KBBI data object
 */
export async function loadKBBIFromList(fileUrls) {
  const mergedData = {};
  const errors = [];
  
  console.log(`[KBBI Loader] Loading ${fileUrls.length} KBBI files...`);
  
  const results = await Promise.allSettled(
    fileUrls.map(url => fetch(url).then(r => r.json()))
  );
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      Object.assign(mergedData, result.value);
      console.log(`[KBBI Loader] ✅ Loaded part ${index + 1}/${fileUrls.length}`);
    } else {
      console.error(`[KBBI Loader] ❌ Failed to load part ${index + 1}:`, result.reason);
      errors.push(`Part ${index + 1}: ${result.reason.message}`);
    }
  });
  
  console.log(`[KBBI Loader] Complete: ${Object.keys(mergedData).toLocaleString('id-ID')} total entries`);
  
  return {
    data: mergedData,
    entryCount: Object.keys(mergedData).length,
    errors
  };
}

/**
 * Get words from KBBI data starting with specific prefix
 * @param {Object} kbbiData - Merged KBBI data object
 * @param {string} prefix - Word prefix to search
 * @param {boolean} excludeUsed - Exclude already used words
 * @param {Set} usedWords - Set of used words
 * @returns {string[]} Array of matching words
 */
export function getWordsByPrefix(kbbiData, prefix, excludeUsed = false, usedWords = new Set()) {
  if (!kbbiData || !prefix) return [];
  
  const p = prefix.toLowerCase();
  const results = [];
  
  for (const key of Object.keys(kbbiData)) {
    const cleanKey = key.toLowerCase();
    // Only include pure single words (no spaces, no punctuation)
    if (/^[a-z]+$/.test(cleanKey) && cleanKey.startsWith(p) && cleanKey.length >= 3) {
      if (!excludeUsed || !usedWords.has(cleanKey)) {
        results.push(key);
      }
    }
  }
  
  return results.sort();
}

/**
 * Extract all valid single words from KBBI data
 * @param {Object} kbbiData - Merged KBBI data object
 * @returns {string[]} Array of valid Indonesian words
 */
export function extractAllWords(kbbiData) {
  if (!kbbiData) return [];
  
  const words = new Set();
  
  for (const key of Object.keys(kbbiData)) {
    // Only add pure single words (no spaces, no punctuation, no prefixes/suffixes like "-an")
    if (/^[a-z]+$/.test(key) && key.length >= 3) {
      words.add(key.toLowerCase());
    }
  }
  
  return [...words].sort();
}
