import { Router } from 'express';
import { db } from '../db';
import { tasks, taskCompletions, users } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export const router = Router();

// Get all active tasks
router.get('/', async (req, res) => {
  try {
    const allTasks = await db.select().from(tasks).where(eq(tasks.status, 'active'));
    res.json({ tasks: allTasks });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, parseInt(req.params.id)));
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ task });
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
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check if already completed
    const existing = await db.select().from(taskCompletions).where(
      sql`${taskCompletions.userId} = ${userId} AND ${taskCompletions.taskId} = ${taskId}`
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Task already completed' });
    }

    const [completion] = await db.insert(taskCompletions).values({
      userId,
      taskId,
      proof,
      reward: task.reward,
      currency: task.currency,
    }).returning();

    res.json({ completion });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Get user's completed tasks
router.get('/my-completions', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const completions = await db.select().from(taskCompletions).where(eq(taskCompletions.userId, userId));
    res.json({ completions });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});
