#!/usr/bin/env node
'use strict';

/**
 * Auto-push hook (Stop event)
 * Pushes current branch to origin if there are unpushed commits.
 * Silent on failure (network issues shouldn't block Stop).
 */

const { execSync } = require('node:child_process');

function main() {
  try {
    // Check if there are commits ahead of remote
    const status = execSync('git status --porcelain -b', { encoding: 'utf8' });
    const ahead = status.includes('ahead');

    // Also check if remote tracking exists
    let hasRemote = false;
    try {
      execSync('git rev-parse --abbrev-ref @{upstream}', { encoding: 'utf8', stdio: 'pipe' });
      hasRemote = true;
    } catch {
      // No upstream — try push with -u
      hasRemote = false;
    }

    if (ahead || !hasRemote) {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      if (hasRemote) {
        execSync(`git push origin ${branch}`, { stdio: 'pipe', timeout: 30000 });
      } else {
        execSync(`git push -u origin ${branch}`, { stdio: 'pipe', timeout: 30000 });
      }
      console.log(`[autopush] pushed ${branch} to origin`);
    }
  } catch (err) {
    // Silent fail — don't block Stop
    console.log(`[autopush] skipped: ${err.message?.split('\n')[0] || 'unknown error'}`);
  }
}

main();
