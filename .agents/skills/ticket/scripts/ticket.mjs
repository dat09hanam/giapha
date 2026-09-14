#!/usr/bin/env node

import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_FILES = ['ticket.md', 'plan.md', 'memory.md'];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function normalizeTicketName(name) {
  const normalized = name
    .trim()
    .replaceAll('Đ', 'D')
    .replaceAll('đ', 'd')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    throw new Error('Ticket name must contain at least one letter or number.');
  }

  return normalized;
}

function yamlString(value) {
  return JSON.stringify(value);
}

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

function templates(name, slug, date) {
  return {
    'ticket.md': `---
name: ${yamlString(name)}
slug: ${yamlString(slug)}
status: "new"
created: "${date}"
updated: "${date}"
---

# Ticket: ${name}

## Request

- Awaiting the request body from the ticket invocation.

## Outcome

- The expected user-visible outcome has not been specified yet.

## Scope

### In

- Not specified yet.

### Out

- Not specified yet.

## Acceptance criteria

- [ ] Convert the request into checkable acceptance criteria before implementation.
`,
    'plan.md': `# Plan

## Current objective

Capture the request and turn it into an implementation-ready plan.

## Work items

- [ ] Record the request and scope in \`ticket.md\`.
- [ ] Define implementation steps and verification.

## Owned paths and coordination hotspots

- Ticket workspace: \`tickets/${slug}/**\`
- Source paths: not claimed yet.
- Coordination hotspots: none identified yet.

## Verification

- Select checks after the affected workspace is known.

## Next action

Record the request body and acceptance criteria.
`,
    'memory.md': `# Memory

## Snapshot

- Status: new
- Last updated: ${date}
- Current result: ticket workspace initialized
- Next action: record the request body and acceptance criteria

## Decisions

- No implementation decisions recorded yet.

## Files and contracts

- Ticket workspace: \`tickets/${slug}/\`
- No source files or contracts recorded yet.

## Verification

- No verification run yet.

## Blockers and risks

- The request body has not been recorded yet.

## Handoff

Read \`ticket.md\`, capture the request, then replace the initial plan before editing source code.
`,
  };
}

async function pathIsDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function inspectTicket(ticketDirectory) {
  const exists = await pathIsDirectory(ticketDirectory);
  const missingFiles = [];

  if (exists) {
    for (const file of REQUIRED_FILES) {
      try {
        const fileStat = await stat(join(ticketDirectory, file));
        if (!fileStat.isFile()) {
          missingFiles.push(file);
        }
      } catch (error) {
        if (error?.code === 'ENOENT') {
          missingFiles.push(file);
        } else {
          throw error;
        }
      }
    }
  }

  return { exists, missingFiles };
}

async function main() {
  const [command, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(' ').trim();

  if (!['resolve', 'init'].includes(command) || !name) {
    fail('Usage: node ticket.mjs <resolve|init> "<ticket name>"');
    return;
  }

  if (name.length > 160 || /[\r\n]/.test(name)) {
    fail('Ticket name must be a single line of at most 160 characters.');
    return;
  }

  const slug = normalizeTicketName(name);
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = process.env.GIAPHA_TICKET_REPOSITORY_ROOT
    ? resolve(process.env.GIAPHA_TICKET_REPOSITORY_ROOT)
    : resolve(scriptDirectory, '..', '..', '..', '..');
  const ticketsRoot = join(repositoryRoot, 'tickets');
  const ticketDirectory = join(ticketsRoot, slug);
  let created = false;
  const createdFiles = [];

  if (command === 'init') {
    await mkdir(ticketsRoot, { recursive: true });

    try {
      await mkdir(ticketDirectory);
      created = true;
    } catch (error) {
      if (error?.code !== 'EEXIST' || !(await pathIsDirectory(ticketDirectory))) {
        throw error;
      }
    }

    for (const [file, content] of Object.entries(templates(name, slug, today()))) {
      try {
        await writeFile(join(ticketDirectory, file), content, { encoding: 'utf8', flag: 'wx' });
        createdFiles.push(file);
      } catch (error) {
        if (error?.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  const state = await inspectTicket(ticketDirectory);
  const displayPath = relative(repositoryRoot, ticketDirectory).replaceAll('\\', '/');

  process.stdout.write(
    `${JSON.stringify({
      name,
      slug,
      path: displayPath,
      exists: state.exists,
      complete: state.exists && state.missingFiles.length === 0,
      missingFiles: state.missingFiles,
      created,
      createdFiles,
    })}\n`,
  );
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
