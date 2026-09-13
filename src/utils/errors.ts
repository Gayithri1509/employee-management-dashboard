// Converts a raw Supabase/PostgREST/GoTrue error message into text safe to
// show a normal user. Two kinds of message reach this:
//
//   1. Messages OUR OWN code raises on purpose (RPC exceptions like "An
//      employee with this email already exists.", or GoTrue's own fairly
//      user-facing auth errors like "Invalid login credentials") -- these
//      are already meant to be read, so they pass through unchanged (after
//      stripping the internal "insufficient_privilege:" prefix our RPCs use
//      for their own PL/pgSQL exceptions).
//   2. Everything else -- JWT/network/SQL-shaped errors ("permission denied
//      for table employees", "Failed to fetch", "invalid input syntax for
//      type uuid") -- which a normal user can't act on and shouldn't see
//      verbatim. These fall back to a generic, actionable message.
//
// This is a safe-list, not a block-list, on purpose: an unrecognized
// message is assumed unsafe to show raw rather than assumed safe.

const SAFE_MESSAGE_PATTERNS: RegExp[] = [
  /already exists/i,
  /already registered/i,
  /still has employees/i,
  /is required/i,
  /not found/i,
  /cannot /i,
  /can't/i,
  /must be different/i,
  /^only /i,
  /^no /i,
  /not linked/i,
  /invalid login credentials/i,
  /invalid email/i,
  /email not confirmed/i,
  /password/i,
  /rate limit/i,
  /select a valid/i,
]

// Legacy prefix from an earlier revision of the 0013 RPCs (superseded by
// 0015's plain-English messages) -- stripped defensively in case any code
// path ever surfaces the older wording.
const INSUFFICIENT_PRIVILEGE_PREFIX = /^insufficient_privilege:\s*/i

export function humanizeError(rawMessage: string, fallback = 'Something went wrong. Please try again.'): string {
  const cleaned = rawMessage.replace(INSUFFICIENT_PRIVILEGE_PREFIX, '').trim()

  if (cleaned === '') {
    return fallback
  }

  const looksSafe = SAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(cleaned))
  return looksSafe ? cleaned : fallback
}
