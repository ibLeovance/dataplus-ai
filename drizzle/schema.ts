import { pgTable, serial, text, varchar, integer, boolean, timestamp, jsonb, numeric, pgEnum } from 'drizzle-orm/pg-core';

export const currencyEnum = pgEnum('currency', ['BTC', 'USDT', 'TRX']);
export const taskStatusEnum = pgEnum('task_status', ['active', 'paused', 'completed']);
export const completionStatusEnum = pgEnum('completion_status', ['pending', 'approved', 'rejected']);
export const withdrawalStatusEnum = pgEnum('withdrawal_status', ['pending', 'approved', 'rejected', 'paid']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  btcAddress: text('btc_address').default(''),
  usdtAddress: text('usdt_address').default(''),
  trxAddress: text('trx_address').default(''),
  referralCode: text('referral_code').unique(),
  referredBy: integer('referred_by').references((): any => users.id),
  referralBonus: numeric('referral_bonus', { precision: 18, scale: 8 }).default('0'),
  totalEarned: numeric('total_earned', { precision: 18, scale: 8 }).default('0'),
  availableBalance: numeric('available_balance', { precision: 18, scale: 8 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  reward: numeric('reward', { precision: 18, scale: 8 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  timeLimit: integer('time_limit').notNull(), // in seconds
  imageUrl: text('image_url').default(''),
  status: taskStatusEnum('status').notNull().default('active'),
  requiredProof: text('required_proof').notNull(), // 'screenshot', 'link', 'text'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const taskCompletions = pgTable('task_completions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  taskId: integer('task_id').notNull().references(() => tasks.id),
  proof: text('proof').notNull(),
  proofImageUrl: text('proof_image_url').default(''),
  status: completionStatusEnum('status').notNull().default('pending'),
  reward: numeric('reward', { precision: 18, scale: 8 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
});

export const withdrawals = pgTable('withdrawals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  amount: numeric('amount', { precision: 18, scale: 8 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  walletAddress: text('wallet_address').notNull(),
  status: withdrawalStatusEnum('status').notNull().default('pending'),
  txHash: text('tx_hash').default(''),
  requestedAt: timestamp('requested_at').defaultNow(),
  processedAt: timestamp('processed_at'),
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
