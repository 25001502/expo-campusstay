const {load, application, data} = require('./profile-harness.cjs');
const property = data.properties[0];
function providerHarness() {
  const slots = [], queue = [], disposed = [], effects = [], resources = [], sources = [];
  let index = 0;
  const react = { createContext: () => ({ Provider: 'Provider' }), useContext() {},
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = index++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useReducer(reducer, initial) { const i = index++; if (!(i in slots)) slots[i] = initial; return [slots[i], (action) => { slots[i] = reducer(slots[i], action); }]; },
    useMemo: (callback) => callback(), useCallback: (callback) => callback, useEffect: (effect) => { if (!effects.length) effects.push(effect()); },
  };
  const adapter = { pick: async (source) => { sources.push(source); const result = queue.shift(); if (result instanceof Error) throw result; return result; }, prepare: async (asset, id) => {
    const resource = { uri: `file://private-${id}`, size: asset.size, prefix: new Uint8Array(asset.mimeType === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10] : asset.mimeType === 'image/jpeg' ? [255, 216, 255, 224] : [37, 80, 68, 70, 45]), readable: true, available() { return this.readable; }, dispose: () => disposed.push(id) };
    resources.push(resource); return resource;
  }, releasePicked() {} };
  const { ApplicationProvider } = load('src/state/ApplicationContext.tsx', { react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) }, '../documentAdapter': { documentAdapter: adapter } });
  const render = () => { index = 0; return ApplicationProvider({ children: null }).props.value; };
  const validDraft = async () => {
    const draft = application.createApplicationDraft(property, 'r2');
    draft.personal = { fullName: 'Synthetic Student', studentNumber: '1234', phone: '0712345678', email: 'synthetic@example.com', universityId: 'univen' };
    draft.emergency = { fullName: 'Synthetic Contact', relationship: 'Parent', phone: '0711111111' }; draft.funding = { source: 'self-funded', paymentDiscussionRequested: true };
    for (const category of ['student-id', 'registration', 'identity']) { queue.push({ canceled: false, assets: [{ name: `${category}.pdf`, size: 200, mimeType: 'application/pdf' }] }); draft.attachments[category] = (await render().chooseDocument(draft.draftId, category)).document; }
    return draft;
  };
  render(); return { render, validDraft, disposed, queue, resources, sources, unmount: () => effects[0]?.() };
}
module.exports = {providerHarness};
