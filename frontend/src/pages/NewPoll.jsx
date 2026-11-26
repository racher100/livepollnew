import { useState } from 'react';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

function validate(question, options) {
  const e = {};
  if (!question.trim()) e.question = 'Please type your question.';
  else if (question.trim().length < 3) e.question = 'The question is too short.';
  const filled = options.map((o) => o.trim()).filter(Boolean);
  if (filled.length < 2) e.options = 'Add at least two answer options.';
  else if (new Set(filled.map((o) => o.toLowerCase())).size !== filled.length) e.options = 'Each option must be different.';
  return e;
}

export default function NewPoll({ token, onCreated }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [errs, setErrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const setOpt = (i, v) => setOptions(options.map((o, j) => (j === i ? v : o)));

  async function create(e) {
    e.preventDefault(); setErr('');
    const v = validate(question, options);
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const d = await api('/polls', { method: 'POST', token, body: { question, options: options.filter((o) => o.trim()) } });
      onCreated(d.poll.id);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <form className="card form-card" onSubmit={create} noValidate>
      <h1>Create a new poll</h1>
      <p className="muted">Ask a question, add the answers, and share it in seconds.</p>

      <label className="field">
        <span>Your question</span>
        <input placeholder="e.g. Which topic should we cover next?" value={question} maxLength={200}
          className={errs.question ? 'bad' : ''} onChange={(e) => setQuestion(e.target.value)} />
        <em>{question.length}/200</em>
        {errs.question && <p className="error">{errs.question}</p>}
      </label>

      <div className="field">
        <span>Answer options</span>
        {options.map((o, i) => (
          <div className="opt-row" key={i}>
            <b>{i + 1}</b>
            <input placeholder={`Option ${i + 1}`} value={o} maxLength={100} onChange={(e) => setOpt(i, e.target.value)} />
            {options.length > 2 && (
              <button type="button" className="icon-btn" title="Remove option" onClick={() => setOptions(options.filter((_, j) => j !== i))}>
                <Icon n="x" />
              </button>
            )}
          </div>
        ))}
        {errs.options && <p className="error">{errs.options}</p>}
        {options.length < 10 && (
          <button type="button" className="ghost add-opt" onClick={() => setOptions([...options, ''])}><Icon n="plus" /> Add option</button>
        )}
      </div>

      {err && <p className="error">{err}</p>}
      <button className="btn-pink big" disabled={busy}>{busy ? 'Creating…' : 'Create poll'}</button>
    </form>
  );
}
