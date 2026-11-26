# First Response

A timed checkout incident simulator by Canary Forge for Toggle Wars, Track 1.

## Run locally

1. Install Node.js 22.12+.
2. Run `npm install`.
3. Run `npm run dev` and open the printed URL.
4. To use Flagsmith, copy `.env.example` to `.env.local`, set `VITE_FLAGSMITH_ENVIRONMENT_ID` to the Development client-side SDK key, and restart Vite. Never put a server or admin key in a Vite variable.

## Preview both versions before launch

Append `?preview=checklist` or `?preview=guided` to the local URL. Practice does not contact Flagsmith or restrict replays.

## Flagsmith experiment

Use the enabled multivariate `runbook_layout` flag with values `checklist` (control) and `guided` (variation with a key). Configure 100% eligible rollout, 50/50 allocation, and the occurrence metric `incident_recovered_in_time` (increase). Connect the warehouse before launching.

The browser SDK identifies the player with a persistent anonymous ID. The app reads the assigned value, renders the runbook, then records the exposure via `getExperimentFlag`. The correct first action within 90 seconds queues a conversion for the same identity. Both events are flushed. Closing or refreshing after starting consumes the browser's attempt, so avoid replaying live sessions during the playtest. This browser-side guard is suitable for the demo; it does not enforce uniqueness across browsers.

Verify event ingestion in a test environment before collecting human results. Keep test traffic out of the human results environment.
