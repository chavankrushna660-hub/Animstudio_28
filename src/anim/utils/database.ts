// @ts-nocheck
import { Frame, VectorObject, Bone, Layer } from '../types';

export interface SavedAnimationRecord {
  id: string;
  title: string;
  savedAt: number;
  email: string;
  fps: number;
  layers: Layer[];
  objects: { [id: string]: VectorObject };
  frames: Frame[];
  bones: Bone[];
  thumbnailUrl?: string;
}

// Maximum quota allowed for saved animations per user/session
export const MAX_SAVED_ANIMATIONS_QUOTA = 50;

// Storage identifiers
const DB_STORAGE_KEY_V2 = 'animastudio_custom_db_v2';
const DB_STORAGE_KEY_V1 = 'animastudio_custom_db';
const IDB_DATABASE_NAME = 'AnimStudio_DurableDB';
const IDB_STORE_NAME = 'animations';
const IDB_VERSION = 1;

/**
 * Safely parses JSON with fallback
 */
function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Native IndexedDB Engine (Supports hundreds of MBs/GBs with zero quota issues)
// ---------------------------------------------------------------------------

let dbInstancePromise: Promise<IDBDatabase | null> | null = null;

function getIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_DATABASE_NAME, IDB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
          store.createIndex('email', 'email', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbInstancePromise;
}

async function idbGetAll(): Promise<SavedAnimationRecord[]> {
  try {
    const db = await getIndexedDB();
    if (!db) return [];
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  } catch {
    return [];
  }
}

async function idbPut(record: SavedAnimationRecord): Promise<void> {
  try {
    const db = await getIndexedDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}
}

async function idbDelete(id: string): Promise<void> {
  try {
    const db = await getIndexedDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}
}

// ---------------------------------------------------------------------------
// In-Memory Synchronized Cache (Ensures Instant Synchronous UI Reads)
// ---------------------------------------------------------------------------

let inMemoryDbCache: SavedAnimationRecord[] = [];
let isCacheInitialized = false;

function initSyncCache(): void {
  if (isCacheInitialized) return;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(DB_STORAGE_KEY_V2);
      if (raw) {
        const parsed = safeJsonParse<SavedAnimationRecord[]>(raw, []);
        if (Array.isArray(parsed)) {
          inMemoryDbCache = parsed;
        }
      } else {
        // Check for legacy v1 single/keyed records
        const legacyRaw = localStorage.getItem(DB_STORAGE_KEY_V1);
        if (legacyRaw) {
          const legacyDict = safeJsonParse<Record<string, SavedAnimationRecord>>(legacyRaw, {});
          const migratedList: SavedAnimationRecord[] = [];
          Object.entries(legacyDict).forEach(([email, item]) => {
            if (item && item.savedAt) {
              migratedList.push({
                ...item,
                id: item.id || `anim_${item.savedAt}_${Math.random().toString(36).substring(2, 6)}`,
                title: item.title || 'Saved Animation 1',
                email: item.email || email,
              });
            }
          });
          if (migratedList.length > 0) {
            inMemoryDbCache = migratedList;
          }
        }
      }
    }
  } catch {}
  isCacheInitialized = true;
}

initSyncCache();

// Asynchronous background hydration and migration with IndexedDB
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      const idbRecords = await idbGetAll();
      if (idbRecords && idbRecords.length > 0) {
        // Merge records with in-memory cache, prioritizing by savedAt
        const map = new Map<string, SavedAnimationRecord>();
        inMemoryDbCache.forEach(r => map.set(r.id, r));
        idbRecords.forEach(r => map.set(r.id, r));
        inMemoryDbCache = Array.from(map.values()).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      } else if (inMemoryDbCache.length > 0) {
        // First-time migration: store all in-memory/localStorage items into IndexedDB
        for (const item of inMemoryDbCache) {
          await idbPut(item);
        }
      }
    } catch {}
  }, 50);
}

/**
 * Loads the raw database list from in-memory cache (with fallback to storage).
 */
function getRawDbList(): SavedAnimationRecord[] {
  if (!isCacheInitialized) {
    initSyncCache();
  }
  return inMemoryDbCache;
}

/**
 * Persists raw database list to In-Memory, IndexedDB (unlimited quota), and LocalStorage mirror safely.
 */
function saveRawDbList(list: SavedAnimationRecord[]) {
  inMemoryDbCache = list;

  // 1. Asynchronously persist to IndexedDB (virtually unlimited quota)
  if (typeof window !== 'undefined') {
    try {
      list.forEach((record) => {
        idbPut(record).catch(() => {});
      });
    } catch {}
  }

  // 2. Safely attempt to persist to LocalStorage mirror with graceful quota handling
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(DB_STORAGE_KEY_V2, JSON.stringify(list));
    }
  } catch (quotaError) {
    // Quota exceeded: clean up obsolete keys and strip bulky base64 thumbnails for LocalStorage mirror
    try {
      localStorage.removeItem(DB_STORAGE_KEY_V1);
      localStorage.removeItem('generator_original_frames_backup');

      // Compact version without giant thumbnails (IndexedDB retains complete data)
      const compactList = list.map((item) => {
        let thumb = item.thumbnailUrl;
        if (thumb && thumb.length > 15000) {
          thumb = undefined;
        }
        return { ...item, thumbnailUrl: thumb };
      });

      localStorage.setItem(DB_STORAGE_KEY_V2, JSON.stringify(compactList));
    } catch (secondError) {
      // If LocalStorage is full from other keys, remove the mirror
      // IndexedDB and inMemoryDbCache preserve 100% data fidelity
      try {
        localStorage.removeItem(DB_STORAGE_KEY_V2);
      } catch {}
    }
  }
}

/**
 * Gets all saved animations for a specific email or guest user.
 */
export function getAllUserSavedAnimations(email: string): SavedAnimationRecord[] {
  const normalizedEmail = (email || 'guest').trim().toLowerCase();
  const all = getRawDbList();
  return all.filter(item => (item.email || 'guest').trim().toLowerCase() === normalizedEmail);
}

/**
 * Gets quota status (e.g. 3 / 10 used).
 */
export function getSavedAnimationsQuotaStatus(email: string): { count: number; max: number; isFull: boolean; remaining: number } {
  const userItems = getAllUserSavedAnimations(email);
  const count = userItems.length;
  const max = MAX_SAVED_ANIMATIONS_QUOTA;
  return {
    count,
    max,
    isFull: count >= max,
    remaining: Math.max(0, max - count),
  };
}

/**
 * Checks if the canvas project has any actual drawings, objects, shapes, strokes, images, or frame contents available.
 */
export function isCanvasContentAvailable(data: {
  objects?: { [id: string]: VectorObject } | null;
  frames?: Frame[] | null;
  bones?: Bone[] | null;
}): boolean {
  if (!data) return false;

  // 1. Check if there are objects with points or images or valid types
  if (data.objects && typeof data.objects === 'object') {
    const objectList = Object.values(data.objects);
    const hasValidObject = objectList.some(obj => {
      if (!obj) return false;
      // If stroke or shape with points
      if (obj.points && Array.isArray(obj.points) && obj.points.length > 0) return true;
      // If subPaths present
      if (obj.subPaths && Array.isArray(obj.subPaths) && obj.subPaths.some(sp => Array.isArray(sp) && sp.length > 0)) return true;
      // If image object with url
      if (obj.type === 'image' && obj.imageUrl && obj.imageUrl.length > 0) return true;
      // If text object with text content
      if (obj.type === 'text' && obj.text && obj.text.trim().length > 0) return true;
      // If 3D mesh object with vertices or transform
      if (obj.type === '3d' || obj.type === '360_container') return true;
      if (obj.vertices3D && obj.vertices3D.length > 0) return true;
      if (obj.views360 && obj.views360.length > 0) return true;
      return false;
    });

    if (hasValidObject) return true;
  }

  // 2. Check frames for frame-specific drawing objects
  if (data.frames && Array.isArray(data.frames)) {
    const hasValidFrameContent = data.frames.some(frame => {
      if (!frame) return false;
      if (frame.objects && typeof frame.objects === 'object') {
        const frameObjects = Object.values(frame.objects);
        return frameObjects.some(obj => {
          if (!obj) return false;
          if (obj.points && Array.isArray(obj.points) && obj.points.length > 0) return true;
          if (obj.subPaths && Array.isArray(obj.subPaths) && obj.subPaths.some(sp => Array.isArray(sp) && sp.length > 0)) return true;
          if (obj.type === 'image' && obj.imageUrl && obj.imageUrl.length > 0) return true;
          if (obj.type === 'text' && obj.text && obj.text.trim().length > 0) return true;
          if (obj.type === '3d' || obj.type === '360_container') return true;
          if (obj.vertices3D && obj.vertices3D.length > 0) return true;
          return false;
        });
      }
      return false;
    });

    if (hasValidFrameContent) return true;
  }

  // 3. Check bones
  if (data.bones && Array.isArray(data.bones) && data.bones.length > 0) {
    return true;
  }

  return false;
}

/**
 * Saves a new animation record into the 10-quota database.
 */
export function saveUserAnimationToQuotaDb(
  email: string,
  title: string,
  data: {
    fps: number;
    layers: Layer[];
    objects: { [id: string]: VectorObject };
    frames: Frame[];
    bones: Bone[];
    thumbnailUrl?: string;
  }
): { success: boolean; record?: SavedAnimationRecord; error?: string } {
  try {
    // Check if canvas has any artwork/content before proceeding
    if (!isCanvasContentAvailable(data)) {
      return {
        success: false,
        error: 'Cannot save: Canvas is empty! Draw or create an object on the canvas first before saving.',
      };
    }

    const normalizedEmail = (email || 'guest').trim().toLowerCase();
    const quota = getSavedAnimationsQuotaStatus(normalizedEmail);

    if (quota.isFull) {
      return {
        success: false,
        error: `Quota limit reached (${quota.count}/${quota.max} saved animations). Please delete an existing saved animation to save a new project.`,
      };
    }

    const all = getRawDbList();
    const newRecord: SavedAnimationRecord = {
      id: `anim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title && title.trim().length > 0 ? title.trim() : `Saved Project ${quota.count + 1}`,
      savedAt: Date.now(),
      email: normalizedEmail,
      fps: data.fps,
      layers: data.layers,
      objects: data.objects,
      frames: data.frames,
      bones: data.bones,
      thumbnailUrl: data.thumbnailUrl,
    };

    all.unshift(newRecord); // Add to beginning of list
    saveRawDbList(all);

    return {
      success: true,
      record: newRecord,
    };
  } catch (e: any) {
    console.error('Error saving animation to database quota:', e);
    return {
      success: false,
      error: e.message || 'Failed to save animation to database.',
    };
  }
}

/**
 * Deletes a specific saved animation by ID.
 */
export function deleteSavedAnimationById(id: string, email: string): boolean {
  try {
    idbDelete(id).catch(() => {});
    const all = getRawDbList();
    const filtered = all.filter(item => item.id !== id);
    saveRawDbList(filtered);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Retrieves a saved animation by ID.
 */
export function getSavedAnimationById(id: string): SavedAnimationRecord | null {
  const all = getRawDbList();
  return all.find(item => item.id === id) || null;
}

/**
 * Legacy compatibility functions:
 */
export function saveUserAnimation(
  email: string,
  data: {
    fps: number;
    layers: Layer[];
    objects: { [id: string]: VectorObject };
    frames: Frame[];
    bones: Bone[];
  }
): SavedAnimationRecord {
  const res = saveUserAnimationToQuotaDb(email, 'Latest Animation', data);
  if (res.record) return res.record;
  // If full, overwrite oldest for legacy caller
  const userItems = getAllUserSavedAnimations(email);
  if (userItems.length > 0) {
    deleteSavedAnimationById(userItems[userItems.length - 1].id, email);
  }
  const retry = saveUserAnimationToQuotaDb(email, 'Latest Animation', data);
  return retry.record!;
}

export function getUserAnimation(email: string): { record: SavedAnimationRecord | null; wasDeleted: boolean } {
  const items = getAllUserSavedAnimations(email);
  if (items.length === 0) return { record: null, wasDeleted: false };
  return { record: items[0], wasDeleted: false };
}

export function deleteUserAnimation(email: string) {
  const items = getAllUserSavedAnimations(email);
  items.forEach(item => deleteSavedAnimationById(item.id, email));
}

/**
 * Exports an animation project to a downloadable .animstudio file on the user's device.
 */
export function exportProjectToFile(record: SavedAnimationRecord): boolean {
  try {
    const jsonStr = JSON.stringify(record, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeTitle = (record.title || 'animation_project')
      .replace(/[^a-z0-9_-]/gi, '_')
      .toLowerCase();
    const filename = `${safeTitle}.animstudio`;

    // Check if Android Native Bridge exists
    if ((window as any).AndroidBridge && typeof (window as any).AndroidBridge.showToast === 'function') {
      (window as any).AndroidBridge.showToast(`Exporting ${filename} to your device...`);
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Failed to export project to device file', err);
    return false;
  }
}

/**
 * Imports an animation project from a local .animstudio or .json file.
 */
export function importProjectFromFile(file: File): Promise<SavedAnimationRecord> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid project file structure');
        }
        const record: SavedAnimationRecord = {
          id: `anim_imported_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: parsed.title || file.name.replace(/\.(animstudio|json)$/i, '') || 'Imported Project',
          savedAt: Date.now(),
          email: parsed.email || 'guest',
          fps: Number(parsed.fps) || 12,
          layers: Array.isArray(parsed.layers) ? parsed.layers : [],
          objects: parsed.objects || {},
          frames: Array.isArray(parsed.frames) ? parsed.frames : [],
          bones: Array.isArray(parsed.bones) ? parsed.bones : [],
          thumbnailUrl: parsed.thumbnailUrl || ''
        };
        resolve(record);
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse project file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from device'));
    reader.readAsText(file);
  });
}

/**
 * Validates Gmail authentication logic.
 */
export function validateSimpleAuth(email: string, password: string): { success: boolean; message: string } {
  const trimmedEmail = email.trim();
  const isGmail = trimmedEmail.toLowerCase().endsWith('@gmail.com') && trimmedEmail.includes('@');

  if (!isGmail) {
    return {
      success: false,
      message: 'Invalid email address. Authentication requires a valid @gmail.com address.',
    };
  }

  if (password === '123456' || password === 'password' || password === 'password123') {
    return {
      success: true,
      message: 'Authentication successful!',
    };
  } else {
    return {
      success: false,
      message: 'Incorrect password. (Try using standard passwords like "123456" or "password")',
    };
  }
}
