const base = 'http://localhost:3005';
const session = 'smoke-session-20260306';

async function run() {
  const results = [];
  const add = (endpoint, status, pass, note) => results.push({ endpoint, status, pass, note });

  let puzzle = null;
  try {
    const r = await fetch(`${base}/api/puzzle?size=6&sessionId=${session}`);
    const j = await r.json();
    puzzle = j;
    add('GET /api/puzzle', r.status, r.ok && !!j.id, `id=${j.id ?? 'n/a'}`);
  } catch (e) {
    add('GET /api/puzzle', 0, false, String(e));
  }

  try {
    const r = await fetch(`${base}/api/puzzle/check`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ puzzleId: puzzle?.id, board: puzzle?.board, mode: 'classic', sessionId: session }),
    });
    const j = await r.json();
    add('POST /api/puzzle/check', r.status, r.ok && typeof j.complete === 'boolean', `complete=${j.complete}`);
  } catch (e) {
    add('POST /api/puzzle/check', 0, false, String(e));
  }

  try {
    const r = await fetch(`${base}/api/puzzle/hint`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ puzzleId: puzzle?.id, currentBoard: puzzle?.board }),
    });
    const j = await r.json();
    const ok = r.ok && (j.hint !== null || j.message === 'Board already matches solution');
    add('POST /api/puzzle/hint', r.status, ok, j.hint ? 'hint=ok' : String(j.message ?? 'no-hint'));
  } catch (e) {
    add('POST /api/puzzle/hint', 0, false, String(e));
  }

  try {
    const r = await fetch(`${base}/api/daily?size=6&sessionId=${session}`);
    const j = await r.json();
    add('GET /api/daily', r.status, r.ok && !!j.dailyId, `dailyId=${j.dailyId ?? 'n/a'}`);
  } catch (e) {
    add('GET /api/daily', 0, false, String(e));
  }

  try {
    const r = await fetch(`${base}/api/journey?sessionId=${session}`);
    const j = await r.json();
    add('GET /api/journey', r.status, r.ok && typeof j.totalLevels === 'number', `nextLevel=${j.nextLevel ?? 'n/a'}`);
  } catch (e) {
    add('GET /api/journey', 0, false, String(e));
  }

  try {
    const r = await fetch(`${base}/api/leaderboard?size=6&limit=10&sessionId=${session}`);
    const j = await r.json();
    add('GET /api/leaderboard', r.status, r.ok && Array.isArray(j.leaderboard), `participants=${j.totalParticipants ?? 'n/a'}`);
  } catch (e) {
    add('GET /api/leaderboard', 0, false, String(e));
  }

  try {
    const r = await fetch(`${base}/api/statistics?sessionId=${session}`);
    const j = await r.json();
    add('GET /api/statistics', r.status, r.ok && typeof j.puzzlesSolved === 'number', `solved=${j.puzzlesSolved ?? 'n/a'}`);
  } catch (e) {
    add('GET /api/statistics', 0, false, String(e));
  }

  console.table(results);
  const failed = results.filter(r => !r.pass).length;
  process.exitCode = failed ? 1 : 0;
}

run();
