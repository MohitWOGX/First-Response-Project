import React, { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import flagsmith from '@flagsmith/flagsmith';
import { actions, checks, limit, recoveredInTime } from './incident.js';
import './style.css';

const environmentID = import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_ID;
const preview = new URLSearchParams(location.search).get('preview');
const practice = preview === 'guided' || preview === 'checklist' ? preview : null;
const identityKey = 'first-response-player';
const completionKey = 'first-response-playtest-completed';

async function loadAssignment() {
  if (practice || !environmentID) return practice ?? 'checklist';
  const identity = localStorage.getItem(identityKey) ?? crypto.randomUUID();
  localStorage.setItem(identityKey, identity);
  await flagsmith.init({ environmentID, identity, enableEvents: true });
  const layout = flagsmith.getValue('runbook_layout');
  if (!flagsmith.hasFeature('runbook_layout') || !['checklist', 'guided'].includes(layout)) {
    throw new Error('Check that runbook_layout is enabled and has the expected values.');
  }
  return layout;
}

function App() {
  const [layout, setLayout] = useState(null);
  const [seconds, setSeconds] = useState(limit / 1000);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const startedAt = useRef(null);
  const submitted = useRef(false);
  const live = Boolean(environmentID && !practice);

  useEffect(() => {
    if (layout === null || result !== null) return;
    const tick = () => setSeconds(Math.max(0, Math.ceil((limit - (performance.now() - startedAt.current)) / 1000)));
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [layout, result]);

  async function start() {
    setLoading(true);
    setMessage('');
    try {
      if (live && localStorage.getItem(completionKey)) {
        setMessage('You already completed the playtest in this browser. Use a practice link to replay.');
        return;
      }
      const assigned = await loadAssignment();
      startedAt.current = performance.now();
      flushSync(() => setLayout(assigned));
      if (live) {
        localStorage.setItem(completionKey, 'started');
        flagsmith.getExperimentFlag('runbook_layout');
        void flagsmith.flushEvents().catch(console.error);
      }
    } catch (error) {
      setMessage(error.message || 'Could not load the experiment. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submit(action) {
    if (submitted.current) return;
    submitted.current = true;
    const qualifies = recoveredInTime(action.id, performance.now() - startedAt.current);
    setResult({ ...action, qualifies });
    if (live && qualifies) {
      try {
        flagsmith.trackEvent('incident_recovered_in_time');
        await flagsmith.flushEvents();
      } catch {
        setMessage('The recovery succeeded. The experiment event could not be confirmed.');
      }
    }
  }

  return <main>
    <header><span>CANARY FORGE</span><span>{live ? 'PLAYTEST' : 'PRACTICE'}</span></header>
    <section className="hero">
      <p className="eyebrow">ON-CALL SIMULATOR</p>
      <h1>First Response</h1>
      <p>Checkout is returning 503s. Inspect the evidence and make one recovery decision.</p>
      {!layout && <button disabled={loading} onClick={start}>{loading ? 'Loading…' : 'Start incident'}</button>}
      {!layout && !live && <nav className="practice-links" aria-labelledby="practice-layout-label">
        <span id="practice-layout-label">Practice layout</span>
        <a href="?preview=checklist" aria-current={(practice ?? 'checklist') === 'checklist' ? 'page' : undefined}>Checklist</a>
        <a href="?preview=guided" aria-current={practice === 'guided' ? 'page' : undefined}>Guided</a>
      </nav>}
    </section>
    {layout && <>
      <div className="status"><strong>INCIDENT · CHECKOUT</strong><span>{result ? 'DECISION RECORDED' : seconds + 's LEFT'}</span></div>
      <div className="columns">
        <section className="panel">
          <h2>Incident evidence</h2>
          <ul className="evidence">
            <li><time>12:01</time> Checkout v42 deploy completes.</li>
            <li><time>12:02</time> Shared config enables live recommendations for all checkout versions.</li>
            <li><time>12:03</time> Recommendation upstream reaches its connection limit. Both checkout versions report timeouts.</li>
            <li><time>12:04</time> Checkout CPU is 31%. Payment and order services pass health checks. Recommendations are optional.</li>
          </ul>
        </section>
        <section className="panel">
          <h2>{live ? 'Recovery runbook' : `Recovery runbook · ${layout === 'guided' ? 'Guided' : 'Checklist'}`}</h2>
          {layout === 'guided'
            ? checks.map(check => <div className="step" key={check.symptom}><h3>{check.symptom}</h3><p>{check.instruction}</p></div>)
            : <ul>{checks.map(check => <li key={check.symptom}>{check.symptom} · {check.instruction}</li>)}</ul>}
        </section>
      </div>
      <section className="panel decisions">
        <h2>Choose a recovery action</h2>
        <div className="actions">{actions.map(action => <button key={action.id} disabled={Boolean(result)} onClick={() => submit(action)}>{action.label}</button>)}</div>
        {result && <div className="outcome" role="status"><strong>{result.qualifies ? 'Recovered within target' : result.id === 'disable' ? 'Recovered after the time limit' : 'Incident unresolved'}</strong><p>{result.result}</p></div>}
      </section>
    </>}
    {message && <p role="alert">{message}</p>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
