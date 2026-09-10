#!/usr/bin/env node
/*
 * roster-guard — PreToolUse spawn GUARD (matcher `Task|Agent`).
 *
 * Re-implemented behaviour (Decision C — re-express, do not port): pin the run to
 * the served agent roster by REFUSING any subagent role that is not on it. A
 * subagent spawn surfaces as tool_name `Task` on some runtimes and `Agent` on
 * others (with `subagent_type` in the payload), so the guard treats an event as a
 * spawn whenever a subagent identifier is present — the primary, label-independent
 * signal — with the tool-name match as belt-and-braces.
 *
 * WHY a hook: native agent-definition files can only ADD named agents; the
 * built-in general-purpose helper cannot be switched off by any project setting. A
 * PreToolUse hook fires on every spawn attempt EVEN under auto-accept, so a
 * `permissionDecision: "deny"` here genuinely blocks the spawn — the only layer
 * that truly enforces "no ad-hoc helpers".
 *
 * ONE SOURCE OF TRUTH: the guard does NOT hardcode the roster. It reads the SERVED
 * roster manifest the client materialised — $HARNESS_ROSTER_FILE wins (the client
 * points it at <.method>/.claude/roster.json), else <cwd>/.claude/roster.json — so
 * generation and enforcement can never diverge. Standalone CommonJS (Claude Code
 * invokes it as plain `node`).
 *
 * Fail-soft: a malformed event, a non-spawn tool, a missing role, or an unreadable
 * roster all fall through to ALLOW — but an unreadable roster ALLOWS *visibly*
 * (a stderr WARN), never silently, so degraded enforcement is never invisible.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function resolveRosterFile(cwd) {
  if (process.env.HARNESS_ROSTER_FILE) return process.env.HARNESS_ROSTER_FILE;
  const base = cwd && typeof cwd === "string" ? cwd : process.cwd();
  return path.join(base, ".claude", "roster.json");
}

function loadRoster(cwd) {
  const p = resolveRosterFile(cwd);
  let raw;
  try {
    raw = fs.readFileSync(p, "utf8");
  } catch (e) {
    return { error: `not found or unreadable (${(e && e.code) || (e && e.message) || "read error"})`, path: p };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { error: `malformed JSON (${(e && e.message) || "parse error"})`, path: p };
  }
  if (!Array.isArray(parsed)) return { error: "manifest is not a JSON array", path: p };
  return { roster: parsed.filter((x) => typeof x === "string") };
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    }) + "\n",
  );
}

function main() {
  let event;
  try {
    event = JSON.parse(readStdin() || "{}");
  } catch {
    return; // malformed → allow (fail-open)
  }
  if (!event) return;
  const input = event.tool_input || {};
  const helper = input.subagent_type;
  const isSpawn = (typeof helper === "string" && helper !== "") || event.tool_name === "Task" || event.tool_name === "Agent";
  if (!isSpawn) return; // not a spawn → allow
  if (typeof helper !== "string" || helper === "") return; // nothing to check → allow

  const loaded = loadRoster(event.cwd);
  if (loaded.error) {
    process.stderr.write(
      `[roster-guard] WARN: roster manifest unreadable (${loaded.path}): ${loaded.error} — spawn ALLOWED, roster enforcement is DEGRADED\n`,
    );
    return; // fail-open, but VISIBLY
  }
  const roster = loaded.roster;
  if (roster.includes(helper)) return; // on-roster → allow

  deny(
    `roster pin: '${helper}' is NOT on this run's pinned agent roster (${roster.join(", ")}). ` +
      `A run may only spawn the served roster — ad-hoc helpers (e.g. general-purpose) are refused. ` +
      `Use a roster role.`,
  );
}

try {
  main();
} catch {
  // A guard hook must never break a launch — fail-soft to ALLOW.
}
process.exit(0);
