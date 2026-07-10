import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('core product routes exist', () => {
  for (const route of ['app/page.tsx','app/scores/page.tsx','app/fixtures/page.tsx','app/tickets/page.tsx','app/table/page.tsx','app/players/page.tsx','app/players/[slug]/page.tsx','app/clubs/[slug]/page.tsx','app/transfers/page.tsx','app/news/page.tsx','app/contributors/page.tsx','app/contributors/[id]/page.tsx','app/contribute/page.tsx','app/contribute/articles/page.tsx','app/contribute/transfers/page.tsx','app/collect/matches/[id]/page.tsx','app/tickets/matches/[matchId]/page.tsx','app/tickets/orders/[publicRef]/page.tsx','app/signup/page.tsx','app/signin/page.tsx','app/account/page.tsx','app/review/page.tsx','app/admin/page.tsx','app/admin/tickets/page.tsx','app/admin/articles/new/page.tsx']) assert.ok(fs.existsSync(new URL(`../${route}`, import.meta.url)), route);
});
