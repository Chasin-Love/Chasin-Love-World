/* STATE — actions/entries (R97): a domain of the single mutation
   surface — text extracted verbatim from the old actions.ts monolith. */
    import type { DiaryEntry, Attachment } from '../../domain/universe';
    import { bucket, newId } from '../store';
    import { externalizeLargeDiaryAttachments } from '../persist';
    import { delLocalPayload, sanitizeDiaryHtml } from '../../vault';
  import { notify } from './shared';

export const entryActions = {
  /* ---------------------------- Diary & Journal -------------------------- */
  addEntry(planetId: string): DiaryEntry {
    const e: DiaryEntry = {
      id: newId(),
      planetId,
      title: 'Untitled page',
      body: '',
      tags: [],
      bookmarked: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
    };
    bucket().entries.push(e);
    notify();
    return e;
  },

  updateEntry(id: string, patch: Partial<DiaryEntry>) {
    const e = bucket().entries.find((x) => x.id === id);
    if (e) {
      const safePatch = typeof patch.body === 'string'
        ? { ...patch, body: sanitizeDiaryHtml(patch.body) }
        : patch;
      Object.assign(e, safePatch, { updatedAt: Date.now() });
      notify();
    }
  },

  deleteEntry(id: string) {
    const removed = bucket().entries.find((x) => x.id === id);
    bucket().entries = bucket().entries.filter((x) => x.id !== id);
    removed?.attachments.forEach((attachment) => {
      if (attachment.payloadRef) void delLocalPayload(attachment.payloadRef).catch(() => undefined);
    });
    notify();
  },

  toggleBookmark(id: string) {
    const e = bucket().entries.find((x) => x.id === id);
    if (e) {
      e.bookmarked = !e.bookmarked;
      notify();
    }
  },

  addAttachment(entryId: string, att: Omit<Attachment, 'id'>) {
    const e = bucket().entries.find((x) => x.id === entryId);
    if (e) {
      e.attachments.push({ ...att, id: newId() });
      e.updatedAt = Date.now();
      notify();
      queueMicrotask(() => void externalizeLargeDiaryAttachments());
    }
  },

  removeAttachment(entryId: string, attId: string) {
    const e = bucket().entries.find((x) => x.id === entryId);
    if (e) {
      const removed = e.attachments.find((a) => a.id === attId);
      e.attachments = e.attachments.filter((a) => a.id !== attId);
      if (removed?.payloadRef) void delLocalPayload(removed.payloadRef).catch(() => undefined);
      notify();
    }
  },

  deleteAttachment(entryId: string, attId: string) {
    entryActions.removeAttachment(entryId, attId);
  },

  updateAttachment(
    entryId: string,
    attId: string,
    patch: Partial<Attachment>
  ) {
    const e = bucket().entries.find((x) => x.id === entryId);
    const a = e?.attachments.find((x) => x.id === attId);
    if (e && a) {
      if (patch.dataUrl && a.payloadRef) {
        void delLocalPayload(a.payloadRef).catch(() => undefined);
        delete a.payloadRef;
        delete a.payloadMissing;
      }
      Object.assign(a, patch);
      e.updatedAt = Date.now();
      notify();
      queueMicrotask(() => void externalizeLargeDiaryAttachments());
    }
  },

};
