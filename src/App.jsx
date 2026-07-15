import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, onValue, set, remove, update } from "firebase/database";

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#0B1A0B", surface: "#122012", card: "#1A2E1A", border: "#2A4A2A",
  accent: "#FF6B2B", gold: "#FFD54F", text: "#EEE8DC", muted: "#6B8F6B",
  win: "#66BB6A", loss: "#EF5350", overlay: "rgba(0,0,0,0.75)",
};

// ─── Streak config ────────────────────────────────────────────────────────────
const STREAK_TIERS = [
  { min: 10, color: "#00E5FF", glow: "rgba(0,229,255,0.6)",   anim: "pulse-teal"   },
  { min: 5,  color: "#C026D3", glow: "rgba(192,38,211,0.6)",  anim: "pulse-purple" },
  { min: 3,  color: "#FF3333", glow: "rgba(255,51,51,0.6)",   anim: "pulse-red"    },
];
const getStreakTier = (n) => STREAK_TIERS.find((t) => n >= t.min) || null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _id = Date.now();
const uid = () => String(_id++);
const winRate = (p) => (p.wins + p.losses === 0 ? 0 : p.wins / (p.wins + p.losses));
const pct = (p) => (p.wins + p.losses === 0 ? "—" : Math.round(winRate(p) * 100) + "%");
const etTimestamp = () =>
  new Date().toLocaleString("en-US", {
    timeZone: "America/New_York", month: "numeric", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }) + " ET";

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KF = `
  @keyframes pulse-red {
    0%,100%{box-shadow:0 0 0 2px #FF3333,0 0 10px 3px rgba(255,51,51,.5)}
    50%{box-shadow:0 0 0 3.5px #FF6666,0 0 18px 6px rgba(255,80,80,.75)}
  }
  @keyframes pulse-purple {
    0%,100%{box-shadow:0 0 0 2px #C026D3,0 0 10px 3px rgba(192,38,211,.5)}
    50%{box-shadow:0 0 0 3.5px #D946EF,0 0 18px 6px rgba(217,70,239,.75)}
  }
  @keyframes pulse-teal {
    0%,100%{box-shadow:0 0 0 2px #00E5FF,0 0 10px 3px rgba(0,229,255,.5)}
    50%{box-shadow:0 0 0 3.5px #67EEFF,0 0 22px 7px rgba(0,229,255,.8)}
  }
`;

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  wrap: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter',system-ui,sans-serif", paddingBottom: 80 },
  header: { padding: "22px 20px 14px", borderBottom: `1px solid ${C.border}`, background: C.surface },
  logo: { fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 34, letterSpacing: 3, color: C.accent, margin: 0, lineHeight: 1 },
  sub: { fontSize: 12, color: C.muted, marginTop: 3, letterSpacing: 0.5 },
  nav: { display: "flex", background: C.surface, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 },
  navBtn: (a) => ({
    flex: 1, padding: "12px 2px 10px", background: "none", border: "none",
    borderBottom: a ? `2px solid ${C.accent}` : "2px solid transparent",
    color: a ? C.accent : C.muted, fontWeight: a ? 700 : 500,
    fontSize: 11, cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.8,
  }),
  sec: { padding: "18px 16px" },
  card: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
  input: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  select: { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (v = "primary") => ({
    background: v === "primary" ? C.accent : "transparent",
    color: v === "primary" ? C.bg : v === "danger" ? C.loss : C.muted,
    border: v === "danger" ? `1px solid ${C.loss}` : v !== "primary" ? `1px solid ${C.border}` : "none",
    borderRadius: 8, padding: "11px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
  }),
  label: { fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, display: "block" },
  overlay: { position: "fixed", inset: 0, background: C.overlay, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal: { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 20px", width: "100%", maxWidth: 380 },
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function CMPNDLeague() {
  // ── Firebase-synced state ────────────────────────────────────────────────
  const [players, setPlayers] = useState({});   // { [id]: player }
  const [matches, setMatches] = useState({});   // { [id]: match }
  const [tournament, setTournament] = useState(null);
  const [connected, setConnected] = useState(false);

  // ── Local UI state ───────────────────────────────────────────────────────
  const [tab, setTab] = useState("standings");
  const [newName, setNewName] = useState("");
  const [p1Id, setP1Id] = useState("");
  const [p2Id, setP2Id] = useState("");
  const [series, setSeries] = useState(null);
  const [seriesResult, setSeriesResult] = useState(null);
  const [editMatch, setEditMatch] = useState(null);
  const [editWinner, setEditWinner] = useState("");
  const [editScore, setEditScore] = useState("2-0");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Firebase listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub1 = onValue(ref(db, "players"), (snap) => {
      setPlayers(snap.val() || {});
      setConnected(true);
    });
    const unsub2 = onValue(ref(db, "matches"), (snap) => {
      setMatches(snap.val() || {});
    });
    const unsub3 = onValue(ref(db, "tournament"), (snap) => {
      const val = snap.val();
      setTournament(val ? JSON.parse(val) : null);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  // Award tournament win once when champion is crowned
  useEffect(() => {
    if (tournament?.champion && !tournament?.championAwarded) {
      const champ = players[tournament.champion];
      if (!champ) return;
      const updates = {};
      updates[`players/${tournament.champion}/tournamentWins`] = (champ.tournamentWins || 0) + 1;
      update(ref(db), updates);
      const updated = { ...tournament, championAwarded: true };
      set(ref(db, "tournament"), JSON.stringify(updated));
    }
  }, [tournament?.champion]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const gp = (id) => players[id];
  const playersList = Object.values(players).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : winRate(b) - winRate(a)
  );
  const matchesList = Object.values(matches).sort((a, b) => (a._created || 0) - (b._created || 0));

  const getStreak = (playerId) => {
    let streak = 0;
    for (let i = matchesList.length - 1; i >= 0; i--) {
      const m = matchesList[i];
      if (m.p1Id !== playerId && m.p2Id !== playerId) continue;
      if (m.winnerId === playerId) streak++;
      else break;
    }
    return streak;
  };

  // ── Player mutations ─────────────────────────────────────────────────────
  const addPlayer = () => {
    const name = newName.trim();
    if (!name || Object.values(players).find((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    const id = uid();
    set(ref(db, `players/${id}`), { id, name, wins: 0, losses: 0, tournamentWins: 0, _created: Date.now() });
    setNewName("");
  };

  const deletePlayer = (id) => remove(ref(db, `players/${id}`));

  // ── Match / Series ───────────────────────────────────────────────────────
  const startSeries = () => {
    if (!p1Id || !p2Id || p1Id === p2Id) return;
    setSeries({ p1Id, p2Id, p1G: 0, p2G: 0, games: [] });
    setTab("play");
  };

  const recordGameWin = (winnerId) => {
    if (!series) return;
    const { p1Id, p2Id, p1G, p2G, games } = series;
    const newP1 = winnerId === p1Id ? p1G + 1 : p1G;
    const newP2 = winnerId === p2Id ? p2G + 1 : p2G;
    const newGames = [...games, winnerId];

    if (newP1 === 2 || newP2 === 2) {
      const winId = newP1 === 2 ? p1Id : p2Id;
      const loseId = winId === p1Id ? p2Id : p1Id;
      const matchId = uid();
      const rec = { id: matchId, p1Id, p2Id, p1G: newP1, p2G: newP2, games: newGames, winnerId: winId, timestamp: etTimestamp(), _created: Date.now() };
      const ups = {};
      ups[`players/${winId}/wins`]      = (players[winId]?.wins || 0) + 1;
      ups[`players/${loseId}/losses`]   = (players[loseId]?.losses || 0) + 1;
      ups[`matches/${matchId}`]          = rec;
      update(ref(db), ups);
      setSeriesResult(rec);
      setSeries(null); setP1Id(""); setP2Id("");
    } else {
      setSeries({ ...series, p1G: newP1, p2G: newP2, games: newGames });
    }
  };

  // ── Delete match ─────────────────────────────────────────────────────────
  const confirmDelete = (matchId) => {
    const m = matches[matchId];
    if (!m) return;
    const loseId = m.winnerId === m.p1Id ? m.p2Id : m.p1Id;
    const ups = {};
    ups[`players/${m.winnerId}/wins`]  = Math.max(0, (players[m.winnerId]?.wins || 0) - 1);
    ups[`players/${loseId}/losses`]    = Math.max(0, (players[loseId]?.losses || 0) - 1);
    ups[`matches/${matchId}`]           = null;
    update(ref(db), ups);
    setDeleteConfirm(null);
  };

  // ── Edit match ────────────────────────────────────────────────────────────
  const openEdit = (m) => {
    setEditMatch(m);
    setEditWinner(m.winnerId);
    setEditScore(m.p1G + m.p2G === 2 ? "2-0" : "2-1");
  };

  const applyEdit = () => {
    if (!editMatch || !editWinner) return;
    const m = editMatch;
    const oldWinId  = m.winnerId;
    const oldLoseId = oldWinId === m.p1Id ? m.p2Id : m.p1Id;
    const newWinId  = editWinner;
    const newLoseId = newWinId === m.p1Id ? m.p2Id : m.p1Id;
    const [wG, lG]  = editScore === "2-0" ? [2, 0] : [2, 1];
    const newP1G    = newWinId === m.p1Id ? wG : lG;
    const newP2G    = newWinId === m.p2Id ? wG : lG;

    // Compute updated win/loss counts
    const w = { ...Object.fromEntries(Object.values(players).map((p) => [p.id, p.wins])) };
    const l = { ...Object.fromEntries(Object.values(players).map((p) => [p.id, p.losses])) };
    w[oldWinId]  = Math.max(0, (w[oldWinId]  || 0) - 1);
    l[oldLoseId] = Math.max(0, (l[oldLoseId] || 0) - 1);
    w[newWinId]  = (w[newWinId]  || 0) + 1;
    l[newLoseId] = (l[newLoseId] || 0) + 1;

    // Rebuild games array
    const newGames = [];
    let wL = wG, lL = lG;
    while (wL > 0 || lL > 0) {
      if (wL > 0) { newGames.push(newWinId);  wL--; }
      if (lL > 0) { newGames.push(newLoseId); lL--; }
    }

    const ups = {};
    ups[`players/${oldWinId}/wins`]   = w[oldWinId];
    ups[`players/${oldLoseId}/losses`]= l[oldLoseId];
    if (oldWinId !== newWinId)  ups[`players/${newWinId}/wins`]   = w[newWinId];
    if (oldLoseId !== newLoseId) ups[`players/${newLoseId}/losses`] = l[newLoseId];
    ups[`matches/${m.id}`] = { ...m, winnerId: newWinId, p1G: newP1G, p2G: newP2G, games: newGames,
      timestamp: m.timestamp.replace(" (edited)", "") + " (edited)" };
    update(ref(db), ups);
    setEditMatch(null);
  };

  // ── Tournament ────────────────────────────────────────────────────────────
  const saveTournament = (t) => set(ref(db, "tournament"), t ? JSON.stringify(t) : null);

  const buildBracket = () => {
    if (playersList.length < 2) return;
    const seeded = [...playersList].sort((a, b) => winRate(b) - winRate(a));
    const size = Math.pow(2, Math.ceil(Math.log2(seeded.length)));
    const padded = [...seeded];
    while (padded.length < size) padded.push(null);
    const firstRound = [];
    for (let i = 0; i < size / 2; i++) {
      const p1 = padded[i], p2 = padded[size - 1 - i];
      if (p1 && !p2) firstRound.push({ p1Id: p1.id, p2Id: null, winnerId: p1.id, p1G: 2, p2G: 0, bye: true });
      else firstRound.push({ p1Id: p1?.id || null, p2Id: p2?.id || null, winnerId: null, p1G: 0, p2G: 0, bye: false });
    }
    saveTournament({ rounds: [firstRound], currentRound: 0, champion: null, championAwarded: false });
  };

  const recordTournamentGame = (rIdx, mIdx, winnerId) => {
    if (!tournament) return;
    const rounds = tournament.rounds.map((r) => r.map((m) => ({ ...m })));
    const match = rounds[rIdx][mIdx];
    const newP1G = winnerId === match.p1Id ? match.p1G + 1 : match.p1G;
    const newP2G = winnerId === match.p2Id ? match.p2G + 1 : match.p2G;
    if (newP1G === 2 || newP2G === 2) {
      match.winnerId = winnerId; match.p1G = newP1G; match.p2G = newP2G;
      const roundDone = rounds[rIdx].every((m) => m.winnerId);
      if (roundDone) {
        const winners = rounds[rIdx].map((m) => m.winnerId);
        if (winners.length === 1) { saveTournament({ ...tournament, rounds, champion: winners[0] }); return; }
        const next = [];
        for (let i = 0; i < winners.length; i += 2) {
          const a = winners[i], b = winners[i + 1];
          next.push({ p1Id: a, p2Id: b || null, winnerId: b ? null : a, p1G: 0, p2G: 0, bye: !b });
        }
        saveTournament({ ...tournament, rounds: [...rounds, next], currentRound: rIdx + 1 });
      } else {
        saveTournament({ ...tournament, rounds });
      }
    } else {
      match.p1G = newP1G; match.p2G = newP2G;
      saveTournament({ ...tournament, rounds });
    }
  };

  const getRoundLabel = (rIdx, total) => {
    const f = total - 1 - rIdx;
    if (f === 0) return "Final";
    if (f === 1) return "Semifinals";
    if (f === 2) return "Quarterfinals";
    return `Round ${rIdx + 1}`;
  };

  // ── Render: Standings ──────────────────────────────────────────────────────
  const renderStandings = () => (
    <div style={S.sec}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input style={S.input} placeholder="Player name…" value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
        <button style={{ ...S.btn(), padding: "11px 18px", whiteSpace: "nowrap" }} onClick={addPlayer}>Add</button>
      </div>
      {playersList.length === 0 && (
        <p style={{ color: C.muted, textAlign: "center", marginTop: 40 }}>No players yet — add some above!</p>
      )}
      {playersList.map((p, i) => {
        const streak = getStreak(p.id);
        const tier   = getStreakTier(streak);
        const tWins  = p.tournamentWins || 0;
        return (
          <div key={p.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
            {/* Rank */}
            <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 30, lineHeight: 1, minWidth: 32, textAlign: "center",
              color: i === 0 ? C.gold : i === 1 ? "#9E9E9E" : i === 2 ? "#A0522D" : C.muted }}>
              {i + 1}
            </div>
            {/* Avatar with streak ring */}
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: C.surface, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 18, color: C.accent,
              border: tier ? `2px solid ${tier.color}` : `2px solid ${C.border}`,
              animation: tier ? `${tier.anim} 1.5s ease-in-out infinite` : "none",
            }}>
              {p.name[0].toUpperCase()}
            </div>
            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</span>
                {tWins > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(255,213,79,0.12)", border: "1px solid rgba(255,213,79,0.35)", borderRadius: 20, padding: "2px 7px", fontSize: 11, color: C.gold, fontWeight: 700, whiteSpace: "nowrap" }}>
                    🏆 {tWins}
                  </span>
                )}
                {tier && (
                  <span style={{ display: "flex", alignItems: "center", gap: 3, background: `${tier.color}18`, border: `1px solid ${tier.color}44`, borderRadius: 20, padding: "2px 7px", fontSize: 11, color: tier.color, fontWeight: 700, whiteSpace: "nowrap" }}>
                    🔥 {streak}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3, display: "flex", gap: 10 }}>
                <span><span style={{ color: C.win }}>W</span> {p.wins}</span>
                <span><span style={{ color: C.loss }}>L</span> {p.losses}</span>
                <span>{pct(p)}</span>
              </div>
            </div>
            {/* Win bar */}
            <div style={{ width: 44, flexShrink: 0 }}>
              <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${winRate(p) * 100}%`, background: C.win, borderRadius: 2 }} />
              </div>
            </div>
            <button onClick={() => deletePlayer(p.id)}
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: "4px 6px", flexShrink: 0 }}>✕</button>
          </div>
        );
      })}
    </div>
  );

  // ── Render: Play ──────────────────────────────────────────────────────────
  const renderPlay = () => {
    if (seriesResult) {
      const w      = gp(seriesResult.winnerId);
      const lId    = seriesResult.p1Id === seriesResult.winnerId ? seriesResult.p2Id : seriesResult.p1Id;
      const l      = gp(lId);
      const streak = getStreak(seriesResult.winnerId);
      const tier   = getStreakTier(streak);
      return (
        <div style={{ ...S.sec, textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>🏓</div>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 14, letterSpacing: 3, color: C.muted, marginBottom: 4 }}>SERIES OVER</div>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 46, color: C.accent, letterSpacing: 2, lineHeight: 1.1 }}>{w?.name}</div>
          {tier && <div style={{ fontSize: 13, color: tier.color, marginTop: 6, fontWeight: 700 }}>🔥 {streak} win streak!</div>}
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>def. {l?.name} · {seriesResult.p1G}–{seriesResult.p2G}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{seriesResult.timestamp}</div>
          <button style={{ ...S.btn(), padding: "14px 32px", marginTop: 28, fontSize: 15 }} onClick={() => setSeriesResult(null)}>Play Another</button>
        </div>
      );
    }
    if (!series) {
      return (
        <div style={S.sec}>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 22, letterSpacing: 2, color: C.accent, marginBottom: 20 }}>NEW SERIES</div>
          <div style={{ marginBottom: 14 }}>
            <span style={S.label}>Player 1</span>
            <select style={S.select} value={p1Id} onChange={(e) => setP1Id(e.target.value)}>
              <option value="">Select player…</option>
              {playersList.filter((p) => p.id !== p2Id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <span style={S.label}>Player 2</span>
            <select style={S.select} value={p2Id} onChange={(e) => setP2Id(e.target.value)}>
              <option value="">Select player…</option>
              {playersList.filter((p) => p.id !== p1Id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button style={{ ...S.btn(), width: "100%", padding: "14px", fontSize: 15 }} onClick={startSeries} disabled={!p1Id || !p2Id}>Start Best of 3</button>
        </div>
      );
    }
    const p1 = gp(series.p1Id), p2 = gp(series.p2Id);
    return (
      <div style={S.sec}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          {series.games.map((gw, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: gw === series.p1Id ? C.accent : "#4FC3F7" }} />
          ))}
          {Array(3 - series.games.length).fill(0).map((_, i) => (
            <div key={"e" + i} style={{ width: 10, height: 10, borderRadius: "50%", background: C.border }} />
          ))}
        </div>
        <div style={{ ...S.card, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "28px 16px", borderColor: C.accent, marginBottom: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 72, color: series.p1G > series.p2G ? C.accent : C.text, lineHeight: 1 }}>{series.p1G}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{p1?.name}</div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 20, color: C.muted }}>VS</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 72, color: series.p2G > series.p1G ? "#4FC3F7" : C.text, lineHeight: 1 }}>{series.p2G}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{p2?.name}</div>
          </div>
        </div>
        <p style={{ textAlign: "center", color: C.muted, fontSize: 12, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Game {series.games.length + 1} — who won?</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ flex: 1, background: C.accent, color: C.bg, border: "none", borderRadius: 8, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer" }} onClick={() => recordGameWin(series.p1Id)}>{p1?.name}</button>
          <button style={{ flex: 1, background: "#4FC3F7", color: C.bg, border: "none", borderRadius: 8, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer" }} onClick={() => recordGameWin(series.p2Id)}>{p2?.name}</button>
        </div>
        <button style={{ ...S.btn("ghost"), width: "100%", padding: "12px", marginTop: 10 }} onClick={() => setSeries(null)}>Cancel</button>
      </div>
    );
  };

  // ── Render: History ───────────────────────────────────────────────────────
  const renderHistory = () => (
    <div style={S.sec}>
      {matchesList.length === 0 && <p style={{ color: C.muted, textAlign: "center", marginTop: 40 }}>No matches yet — play some!</p>}
      {[...matchesList].reverse().map((m) => {
        const p1 = gp(m.p1Id), p2 = gp(m.p2Id);
        const winner = gp(m.winnerId);
        const loser  = gp(m.winnerId === m.p1Id ? m.p2Id : m.p1Id);
        return (
          <div key={m.id} style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  <span style={{ color: C.win }}>{winner?.name}</span>
                  <span style={{ color: C.muted }}> def. </span>
                  <span>{loser?.name}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Best of 3 · {p1?.name} {m.p1G}–{m.p2G} {p2?.name}</div>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                <button onClick={() => openEdit(m)} style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Edit</button>
                <button onClick={() => setDeleteConfirm(m.id)} style={{ background: "none", border: `1px solid ${C.loss}`, color: C.loss, borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Del</button>
              </div>
            </div>
            {m.games && m.games.length > 0 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {m.games.map((gw, i) => {
                  const gPlayer = gp(gw);
                  return (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: C.muted, display: "flex", gap: 4, alignItems: "center" }}>
                      <span>G{i + 1}</span>
                      <span style={{ color: gw === m.winnerId ? C.win : C.text, fontWeight: 600 }}>{gPlayer?.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.muted }}>{m.timestamp}</div>
          </div>
        );
      })}

      {deleteConfirm && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 22, color: C.loss, letterSpacing: 1, marginBottom: 8 }}>DELETE MATCH?</div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>This removes the match and reverses both players' records.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...S.btn("danger"), flex: 1, padding: "12px" }} onClick={() => confirmDelete(deleteConfirm)}>Delete</button>
              <button style={{ ...S.btn("ghost"), flex: 1, padding: "12px" }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {editMatch && (() => {
        const p1 = gp(editMatch.p1Id), p2 = gp(editMatch.p2Id);
        return (
          <div style={S.overlay}>
            <div style={S.modal}>
              <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 22, color: C.accent, letterSpacing: 1, marginBottom: 16 }}>EDIT RESULT</div>
              <div style={{ marginBottom: 14 }}>
                <span style={S.label}>Series Winner</span>
                <select style={S.select} value={editWinner} onChange={(e) => setEditWinner(e.target.value)}>
                  <option value={editMatch.p1Id}>{p1?.name}</option>
                  <option value={editMatch.p2Id}>{p2?.name}</option>
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={S.label}>Series Score</span>
                <select style={S.select} value={editScore} onChange={(e) => setEditScore(e.target.value)}>
                  <option value="2-0">2–0 (sweep)</option>
                  <option value="2-1">2–1 (went to game 3)</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...S.btn(), flex: 1, padding: "12px" }} onClick={applyEdit}>Save</button>
                <button style={{ ...S.btn("ghost"), flex: 1, padding: "12px" }} onClick={() => setEditMatch(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );

  // ── Render: Tournament ────────────────────────────────────────────────────
  const renderTournament = () => {
    if (!tournament) {
      return (
        <div style={{ ...S.sec, textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 30, color: C.gold, letterSpacing: 3, marginBottom: 8 }}>CHAMPIONSHIP</div>
          <p style={{ color: C.muted, fontSize: 13, maxWidth: 280, margin: "0 auto 8px", lineHeight: 1.6 }}>Single elimination · seeded by win rate · best of 3 each round.</p>
          <p style={{ color: C.muted, fontSize: 12, marginBottom: 30 }}>{playersList.length} player{playersList.length !== 1 ? "s" : ""} ready</p>
          {playersList.length < 2
            ? <p style={{ color: C.muted }}>Need at least 2 players.</p>
            : <button style={{ ...S.btn(), padding: "15px 36px", fontSize: 15 }} onClick={buildBracket}>Generate Bracket</button>}
        </div>
      );
    }
    if (tournament.champion) {
      const champ = gp(tournament.champion);
      return (
        <div style={{ ...S.sec, textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 14, letterSpacing: 4, color: C.muted }}>CHAMPION</div>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 52, color: C.gold, letterSpacing: 2, lineHeight: 1.1, margin: "6px 0 4px" }}>{champ?.name}</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>🏆 {champ?.tournamentWins || 1} tournament win{(champ?.tournamentWins || 1) !== 1 ? "s" : ""} total</div>
          <button style={{ ...S.btn("ghost"), padding: "12px 28px" }} onClick={() => saveTournament(null)}>New Tournament</button>
        </div>
      );
    }
    return (
      <div style={S.sec}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 22, color: C.gold, letterSpacing: 2 }}>
            {getRoundLabel(tournament.currentRound, tournament.rounds.length + 1).toUpperCase()}
          </div>
          <button style={{ background: "none", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: "pointer" }} onClick={() => saveTournament(null)}>Reset</button>
        </div>
        {tournament.rounds.map((round, rIdx) => (
          <div key={rIdx} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
              {getRoundLabel(rIdx, tournament.rounds.length + 1)}
            </div>
            {round.map((match, mIdx) => {
              const p1 = gp(match.p1Id), p2 = gp(match.p2Id);
              const isActive = rIdx === tournament.currentRound && !match.winnerId && !match.bye;
              if (match.bye) return (
                <div key={mIdx} style={{ ...S.card, opacity: 0.5, marginBottom: 8 }}>
                  <span style={{ color: C.muted, fontSize: 13 }}>{p1?.name} — bye</span>
                </div>
              );
              return (
                <div key={mIdx} style={{ ...S.card, marginBottom: 8, borderColor: isActive ? C.accent : C.border, opacity: rIdx < tournament.currentRound ? 0.65 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isActive ? 12 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <span style={{ fontWeight: match.winnerId === match.p1Id ? 700 : 400, color: match.winnerId === match.p1Id ? C.win : C.text, flex: 1 }}>{p1?.name || "TBD"}</span>
                      <span style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 18, color: C.muted, minWidth: 40, textAlign: "center" }}>{match.p1G} – {match.p2G}</span>
                      <span style={{ fontWeight: match.winnerId === match.p2Id ? 700 : 400, color: match.winnerId === match.p2Id ? C.win : C.text, flex: 1, textAlign: "right" }}>{p2?.name || "TBD"}</span>
                    </div>
                    {match.winnerId && <span style={{ fontSize: 14, color: C.win, marginLeft: 8 }}>✓</span>}
                  </div>
                  {isActive && (
                    <>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Game {match.p1G + match.p2G + 1} — who won?</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ flex: 1, background: C.accent, color: C.bg, border: "none", borderRadius: 7, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={() => recordTournamentGame(rIdx, mIdx, match.p1Id)}>{p1?.name}</button>
                        <button style={{ flex: 1, background: "#4FC3F7", color: C.bg, border: "none", borderRadius: 7, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer" }} onClick={() => recordTournamentGame(rIdx, mIdx, match.p2Id)}>{p2?.name}</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ── Shell ─────────────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{ ...S.wrap, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: C.muted, fontSize: 13 }}>Connecting…</span>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      <style>{KF}</style>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      <div style={S.header}>
        <div style={S.logo}>🏓 CMPND LEAGUE</div>
        <div style={S.sub}>Building Tournament Tracker</div>
      </div>
      <div style={S.nav}>
        {[["standings","🏅 Standings"],["play","⚡ Play"],["history","📋 History"],["tournament","🏆 Bracket"]].map(([id, label]) => (
          <button key={id} style={S.navBtn(tab === id)} onClick={() => { setSeriesResult(null); setTab(id); }}>{label}</button>
        ))}
      </div>
      {tab === "standings"  && renderStandings()}
      {tab === "play"       && renderPlay()}
      {tab === "history"    && renderHistory()}
      {tab === "tournament" && renderTournament()}
    </div>
  );
}
