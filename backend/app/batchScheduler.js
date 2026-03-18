/**
 * Planificateur de tâches batch pour SBI (node-cron)
 */

import cron from 'node-cron';

const _jobs = new Map();

function startScheduler() {
  // Le scheduler node-cron est toujours actif
  console.log('✓ Planificateur de tâches démarré.');
}

function stopScheduler() {
  for (const [id, task] of _jobs) {
    task.stop();
  }
  _jobs.clear();
}

function addRefreshJob(jobId, cronExpression, func) {
  // Si un job existe déjà, le supprimer
  if (_jobs.has(jobId)) {
    _jobs.get(jobId).stop();
  }
  const task = cron.schedule(cronExpression, func);
  _jobs.set(jobId, task);
}

function removeJob(jobId) {
  if (_jobs.has(jobId)) {
    _jobs.get(jobId).stop();
    _jobs.delete(jobId);
  }
}

function getJobs() {
  return Array.from(_jobs.entries()).map(([id]) => ({
    id,
    name: id,
    next_run: null,
    trigger: 'cron',
  }));
}

export { startScheduler, stopScheduler, addRefreshJob, removeJob, getJobs };
