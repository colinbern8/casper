import express from 'express';
import { requireRole } from './auth';
import type { SlidingWindowLimiter } from './rateLimit';
import { screenMessage } from './safety';
import { builtInReply, normalizeHistory, type ChatContext } from './chat';

export interface ChatDeps {
  limiter: SlidingWindowLimiter;
}

// Free-text questions get a built-in answer. There is no AI behind this route.
export function createChatRouter({ limiter }: ChatDeps) {
  const router = express.Router();

  router.post('/', requireRole('student'), (req, res) => {
    const user = req.user!;
    const history = normalizeHistory(req.body?.messages);
    if (!history) {
      res.status(400).json({ error: 'INVALID_MESSAGES', text: 'Please send a message.' });
      return;
    }
    const uc = req.body?.userContext && typeof req.body.userContext === 'object' ? req.body.userContext : {};

    // Schools share one public IP, so the per-IP ceiling is generous; the per-user limit is the tight one.
    const ipCheck = limiter.hit(`chat-ip:${req.ip || 'unknown'}`, 120, 60_000);
    const userCheck = limiter.hit(`chat-user:${user.email}`, 5, 30_000);
    if (!ipCheck.allowed || !userCheck.allowed) {
      const wait = Math.max(1, Math.ceil(Math.max(ipCheck.retryAfterMs, userCheck.retryAfterMs) / 1000));
      res.status(429).json({
        text: `Please wait ${wait} seconds before sending another message.`,
        isSafetyBlocked: true,
        cooldownSeconds: wait,
      });
      return;
    }

    const isStudent = user.role === 'student';

    for (const turn of history) {
      if (turn.role !== 'user') continue;
      const screen = screenMessage(turn.content);
      if (screen.blocked) {
        res.json({
          text: screen.message,
          isSafetyBlocked: true,
          needsEscalation: false,
          suggestedActions: isStudent
            ? ['Chromebook will not turn on', 'Cannot connect to school Wi-Fi', 'Forgot account password or login']
            : ['Smartboard or display shows "No Signal"', 'Student Chromebook cannot connect to Wi-Fi', 'Audio playing from laptop instead of room speakers'],
        });
        return;
      }
    }

    const ctx: ChatContext = { isStudent, deviceType: typeof uc.deviceType === 'string' ? uc.deviceType : '' };
    res.json(builtInReply(ctx, history[history.length - 1].content));
  });

  return router;
}
