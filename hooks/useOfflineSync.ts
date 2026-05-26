/**
 * useOfflineSync
 *
 * React hook that:
 *   1. Registers the service worker (sw.js)
 *   2. Tracks online/offline status
 *   3. Queues offline writes to IndexedDB
 *   4. Automatically syncs the queue when the connection returns
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type OfflineRecordType = 'quiz_answer' | 'progress_update' | 'assignment_submission' | 'note';

interface OfflineRecord {
  client_id: string;
  type: OfflineRecordType;
  entity_id: string;
  user_id: string;
  school_id: string;
  payload: Record<string, unknown>;
  client_timestamp: string;
}

interface SyncResult {
  client_id: string;
  status: 'synced' | 'conflict' | 'error';
  server_timestamp?: string;
  error?: string;
}

interface SyncReport {
  total: number;
  synced: number;
  conflicts: number;
  errors: number;
  results: SyncResult[];
}

const DB_NAME = 'aischool-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'client_id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueRecord(record: OfflineRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued(): Promise<OfflineRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as OfflineRecord[]);
    req.onerror = () => reject(req.error);
  });
}

async function removeRecords(clientIds: string[]): Promise<void> {
  if (clientIds.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    clientIds.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useOfflineSync(userId: string, schoolId: string) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queueSize, setQueueSize] = useState(0);
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  /**
   * Attempt to sync all queued records with the server.
   * Defined before the effects that reference it to avoid stale closures.
   */
  const syncQueue = useCallback(async (): Promise<void> => {
    if (syncInProgress.current || !isOnline) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      const records = await getAllQueued();
      if (records.length === 0) return;

      const res = await fetch('/api/offline-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (!res.ok) return;

      const data = await res.json() as { report: SyncReport };
      const report = data.report;
      setLastSyncReport(report);

      // Remove successfully synced records
      const syncedIds = report.results
        .filter((r) => r.status === 'synced' || r.status === 'conflict')
        .map((r) => r.client_id);
      await removeRecords(syncedIds);
      setQueueSize((prev) => Math.max(0, prev - syncedIds.length));

      console.log('[OfflineSync] Sync complete', report);
    } catch (err) {
      console.error('[OfflineSync] Sync failed', err);
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [isOnline]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[OfflineSync] Service worker registered', reg.scope);
        })
        .catch((err) => {
          console.error('[OfflineSync] Service worker registration failed', err);
        });

      // Listen for SW messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'TRIGGER_OFFLINE_SYNC') {
          syncQueue();
        }
      });
    }
  }, [syncQueue]);

  // Track online/offline
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      syncQueue();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncQueue]);

  // Refresh queue size
  useEffect(() => {
    const refresh = async () => {
      const records = await getAllQueued();
      setQueueSize(records.length);
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Queue a record for later sync (or sync immediately if online).
   */
  const enqueue = useCallback(
    async (
      type: OfflineRecordType,
      entityId: string,
      payload: Record<string, unknown>,
    ): Promise<void> => {
      const record: OfflineRecord = {
        client_id: crypto.randomUUID(),
        type,
        entity_id: entityId,
        user_id: userId,
        school_id: schoolId,
        payload,
        client_timestamp: new Date().toISOString(),
      };

      if (isOnline) {
        // Try to sync immediately
        try {
          const res = await fetch('/api/offline-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: [record] }),
          });
          if (res.ok) return;
        } catch {
          // Fall through to queue
        }
      }

      // Store in IndexedDB for later sync
      await queueRecord(record);
      setQueueSize((prev) => prev + 1);
    },
    [isOnline, userId, schoolId],
  );

  /**
   * Attempt to sync all queued records with the server.
   */
  const syncQueue2 = syncQueue; // already defined above; re-exported below

  return {
    isOnline,
    queueSize,
    isSyncing,
    lastSyncReport,
    enqueue,
    syncQueue: syncQueue2,
  };
}
