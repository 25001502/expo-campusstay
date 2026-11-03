import { UserFacingError } from '../errors';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  addSubmittedApplication,
  createSubmittedApplication,
  validateApplication,
  type ApplicationDraft,
  type SubmittedApplication,
} from '../application';
import { properties } from '../data';
import { AttachmentSession, type AttachmentSource, type PreviewResult, type SelectionResult } from '../attachmentSession';
import { documentAdapter } from '../documentAdapter';
import { copyAttachments, validLocalDocument, type DocumentAttachments, type DocumentCategoryId, type LocalDocument } from '../documents';
import { normalizeFunding, validateFunding, type FundingDeclaration } from '../funding';

type ApplicationContextValue = {
  applications: SubmittedApplication[];
  submitApplication: (draft: ApplicationDraft) => SubmittedApplication;
  getApplication: (id: string) => SubmittedApplication | undefined;
  clearApplications: () => void;
  updateFunding: (id: string, editor: string, funding: FundingDeclaration, document?: LocalDocument) => Promise<void>;
  picking: boolean;
  attachmentRevision: number;
  chooseDocument: (owner: string, category: DocumentCategoryId, source?: AttachmentSource) => Promise<SelectionResult>;
  removeDocument: (owner: string, id: string) => void;
  releaseDraft: (owner: string) => void;
  checkDraftDocuments: (draft: ApplicationDraft) => Promise<ApplicationDraft>;
  refreshDocuments: (owner: string, attachments: DocumentAttachments) => Promise<void>;
  documentStatus: (owner: string, id: string) => 'attached-local' | 'unavailable';
  canPreviewDocument: (owner: string, document: LocalDocument) => boolean;
  previewDocument: (owner: string, document: LocalDocument) => PreviewResult;
};

type Action = { type: 'add'; application: SubmittedApplication } | { type: 'clear' } | { type: 'funding'; id: string; funding: FundingDeclaration; document?: LocalDocument };

export function applicationReducer(state: SubmittedApplication[], action: Action) {
  if (action.type === 'add') return addSubmittedApplication(state, action.application);
  if (action.type === 'funding') return state.map((application) => {
    if (application.id !== action.id) return application;
    const attachments = { ...application.attachments };
    if (action.document) attachments.funding = copyAttachments({ funding: action.document }).funding;
    else delete attachments.funding;
    return { ...application, funding: normalizeFunding(action.funding), attachments,
      selectedDocuments: application.selectedDocuments.filter((category) => category !== 'funding') };
  });
  return [];
}

const ApplicationContext = createContext<ApplicationContextValue | undefined>(undefined);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const [applications, dispatch] = useReducer(applicationReducer, []);
  // A revision guard invalidates asynchronous saves without duplicating application state.
  const revision = useRef(0);
  const apply = useCallback((action: Action) => { revision.current += 1; dispatch(action); }, []);
  const sequence = useRef(0);
  const [session] = useState(() => new AttachmentSession(documentAdapter));
  const [picking, setPicking] = useState(false);
  const [attachmentRevision, setAttachmentRevision] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; session.clear(); }; }, [session]);
  const changed = useCallback(() => setAttachmentRevision((value) => value + 1), []);
  const chooseDocument = useCallback(async (owner: string, category: DocumentCategoryId, source?: AttachmentSource) => {
    if (session.busy) return { status: 'busy' as const };
    setPicking(true);
    try { return await session.choose(owner, category, source); } finally { if (mounted.current) { setPicking(false); changed(); } }
  }, [changed, session]);
  const removeDocument = useCallback((owner: string, id: string) => { session.remove(owner, id); changed(); }, [changed, session]);
  const releaseDraft = useCallback((owner: string) => { session.releaseOwner(owner); changed(); }, [changed, session]);
  const checkDraftDocuments = useCallback(async (draft: ApplicationDraft) => {
    const attachments = await session.inspect(draft.draftId, draft.attachments);
    changed();
    return { ...draft, attachments };
  }, [changed, session]);
  const refreshDocuments = useCallback(async (owner: string, attachments: DocumentAttachments) => {
    await session.inspect(owner, attachments); changed();
  }, [changed, session]);
  const documentStatus = useCallback((owner: string, id: string) => session.status(owner, id), [session]);
  const canPreviewDocument = useCallback((owner: string, document: LocalDocument) => session.canPreview(owner, document), [session]);
  const previewDocument = useCallback((owner: string, document: LocalDocument) => { const result = session.preview(owner, document); changed(); return result; }, [changed, session]);

  const submitApplication = useCallback((draft: ApplicationDraft) => {
    const property = properties.find((item) => item.id === draft.propertyId);
    if (!property || Object.keys(validateApplication(draft, property)).length
      || Object.values(draft.attachments).some((document) => !session.matches(draft.draftId, document))) {
      throw new Error('Review the application and choose its required files again.');
    }
    sequence.current += 1;
    const application = createSubmittedApplication(draft, new Date().toISOString(), sequence.current);
    session.promote(draft.draftId, application.id, draft.attachments);
    apply({ type: 'add', application });
    changed();
    return application;
  }, [apply, changed, session]);

  const updateFunding = useCallback(async (id: string, editor: string, funding: FundingDeclaration, document?: LocalDocument) => {
    const application = applications.find((item) => item.id === id);
    const startedAtRevision = revision.current;
    if (!application || application.status !== 'saved-locally') throw new UserFacingError('application');
    if (session.busy) throw new UserFacingError('pickerBusy');
    if (applications.some((item) => item.id === editor)) throw new UserFacingError('fundingEditor');
    const error = validateFunding(funding);
    if (error) throw new UserFacingError(error === 'Choose your current NSFAS funding status.' ? 'fundingStatus' : 'fundingSource');
    let checked: LocalDocument | undefined;
    if (document) {
      const owner = document.id === application.attachments?.funding?.id ? id : editor;
      if (document.category !== 'funding' || !session.matches(owner, document)) throw new UserFacingError('fundingFile');
      checked = (await session.inspect(owner, { funding: document })).funding;
      if (!validLocalDocument(checked, 'funding') || !checked || !session.matches(owner, checked)) { changed(); throw new UserFacingError('fundingFile'); }
    }
    // Logout or another update during asynchronous file validation must not revive stale records.
    if (!mounted.current || revision.current !== startedAtRevision) throw new UserFacingError('changed');
    session.commitFunding(editor, id, checked, application.attachments?.funding?.id);
    apply({ type: 'funding', id, funding: normalizeFunding(funding), document: checked });
    changed();
  }, [applications, apply, changed, session]);

  const getApplication = useCallback(
    (id: string) => applications.find((application) => application.id === id),
    [applications],
  );
  const clearApplications = useCallback(() => {
    session.clear();
    sequence.current = 0;
    apply({ type: 'clear' }); changed();
  }, [apply, changed, session]);

  const value = useMemo(() => ({ applications, submitApplication, getApplication, clearApplications, updateFunding, picking, attachmentRevision,
    chooseDocument, removeDocument, releaseDraft, checkDraftDocuments, refreshDocuments, documentStatus, canPreviewDocument, previewDocument,
  }), [applications, clearApplications, getApplication, submitApplication, updateFunding, picking, attachmentRevision, chooseDocument, removeDocument, releaseDraft, checkDraftDocuments, refreshDocuments, documentStatus, canPreviewDocument, previewDocument]);
  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplications() {
  const value = useContext(ApplicationContext);
  if (!value) throw new Error('useApplications must be used within ApplicationProvider');
  return value;
}
