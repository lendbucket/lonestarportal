import "server-only";

import { prisma } from "./prisma";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Check if a login key (email or IP) is currently locked out.
 * Returns true if locked (should block the attempt).
 */
export async function isLockedOut(key: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);

  const recentFailures = await prisma.loginAttempt.count({
    where: {
      key,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  if (recentFailures < MAX_ATTEMPTS) return false;

  // Check if there was a successful login after the failures
  const lastSuccess = await prisma.loginAttempt.findFirst({
    where: {
      key,
      success: true,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "desc" },
  });

  const lastFailure = await prisma.loginAttempt.findFirst({
    where: {
      key,
      success: false,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "desc" },
  });

  if (lastSuccess && lastFailure && lastSuccess.createdAt > lastFailure.createdAt) {
    return false;
  }

  return true;
}

/**
 * Record a login attempt (success or failure).
 */
export async function recordLoginAttempt(
  key: string,
  success: boolean
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { key, success },
  });

  if (!success) {
    const windowStart = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
    const count = await prisma.loginAttempt.count({
      where: {
        key,
        success: false,
        createdAt: { gte: windowStart },
      },
    });

    if (count >= MAX_ATTEMPTS) {
      console.warn(
        `[rate-limit] Lockout triggered for key="${key}" after ${count} failed attempts`
      );
    }
  }
}

/**
 * Clean up old login attempts (call periodically).
 */
export async function cleanupLoginAttempts(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
}
