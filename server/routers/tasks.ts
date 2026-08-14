import { Router } from 'express';
import { db, toCamel, toCamelList } from '../db';

export const router = Router();

// Get all active tasks
router.get('/', async (req, res) => {
  try {
    const allTasks = await db.select('tasks', { key: 'status', value: 'active' });
    res.json({ tasks: toCamelList(allTasks) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get user's completed tasks (BEFORE '/:id' so 'my-completions' is not treated as an id)
router.get('/my-completions', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const completions = await db.select('completions', { key: 'user_id', value: userId });
    const withTitles = await Promise.all(
      completions.map(async c => {
        const taskRows = await db.select('tasks', { key: 'id', value: c.task_id });
        const t = taskRows[0];
        return { ...c, task_title: t?.title || null };
      })
    );
    res.json({ completions: toCamelList(withTitles) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Submit task completion
router.post('/complete', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { taskId, proof } = req.body;
    const taskRows = await db.select('tasks', { key: 'id', value: taskId });
    const task = taskRows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const existing = await db.select('completions', { key: 'task_id', value: taskId });
    const dup = existing.find(c => c.user_id === userId);
    if (dup) {
      return res.status(409).json({ error: 'Task already completed' });
    }

    const completion = await db.insert('completions', {
      user_id: userId,
      task_id: taskId,
      proof: proof || '',
      reward: task.reward,
      currency: task.currency,
    });
    res.json({ completion: toCamel(completion) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get task by ID (keep AFTER /my-completions so 'my-completions' is not treated as an id)
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.select('tasks', { key: 'id', value: parseInt(req.params.id) });
    const task = rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task: toCamel(task) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
