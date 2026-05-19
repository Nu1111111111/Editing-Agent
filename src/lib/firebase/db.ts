'use client';

import { collection, doc } from 'firebase/firestore';
import { db } from './client';

export const projectsRef = (uid: string) => collection(db, 'users', uid, 'projects');
export const projectRef = (uid: string, pid: string) => doc(db, 'users', uid, 'projects', pid);
export const assetsRef = (uid: string, pid: string) =>
  collection(db, 'users', uid, 'projects', pid, 'assets');
export const assetRef = (uid: string, pid: string, aid: string) =>
  doc(db, 'users', uid, 'projects', pid, 'assets', aid);
export const transcriptRef = (uid: string, pid: string, aid: string) =>
  doc(db, 'users', uid, 'projects', pid, 'transcripts', aid);
export const timelineRef = (uid: string, pid: string) =>
  doc(db, 'users', uid, 'projects', pid, 'timeline', 'main');
