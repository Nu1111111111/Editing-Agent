'use client';

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './client';

export function buildStoragePath(uid: string, pid: string, aid: string, ext: string) {
  return `users/${uid}/${pid}/${aid}.${ext}`;
}

export async function uploadFile(path: string, file: File): Promise<void> {
  await uploadBytes(ref(storage, path), file);
}

export async function getAssetUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}
