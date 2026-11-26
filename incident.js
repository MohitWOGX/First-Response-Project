export const limit = 90_000;
export const checks = [
  { symptom: 'After a rollout', instruction: 'Compare failures across the previous and current deployment.' },
  { symptom: 'Dependency timeouts', instruction: 'Check whether checkout can complete without the timed-out dependency.' },
  { symptom: 'Capacity saturation', instruction: 'Check whether spare capacity exists and where requests are queuing.' },
];
export const actions = [
  { id: 'rollback', label: 'Rollback checkout deployment', result: 'The shared configuration stays active after rollback. Checkout errors continue.' },
  { id: 'scale', label: 'Scale checkout workers', result: 'Additional workers send more traffic to the saturated dependency. Checkout errors continue.' },
  { id: 'disable', label: 'Disable live recommendations', result: 'Checkout skips the optional request and payment processing continues. Service restored.' },
];
export function recoveredInTime(action, elapsed) {
  return action === 'disable' && elapsed >= 0 && elapsed <= limit;
}
