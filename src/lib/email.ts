/**
 * Email sending via Resend.
 * Set RESEND_API_KEY in .env.local to enable.
 * FROM_EMAIL defaults to the Resend sandbox address for development.
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

const FROM = process.env.FROM_EMAIL ?? "GetGrowth <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://getgrowth.eu";

function brand(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#f5f4f0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
  .wrap { max-width:560px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.06); }
  .header { background:#1E1B4B; padding:28px 32px; }
  .header a { color:#F59E0B; font-weight:700; font-size:18px; text-decoration:none; letter-spacing:-0.3px; }
  .body { padding:32px; }
  h2 { margin:0 0 12px; color:#1E1B4B; font-size:20px; font-weight:700; line-height:1.3; }
  p { margin:0 0 16px; color:#4b5563; font-size:15px; line-height:1.6; }
  .cta { display:inline-block; margin:8px 0 20px; padding:14px 28px; background:#1E1B4B; color:#fff!important; font-weight:600; font-size:15px; border-radius:10px; text-decoration:none; }
  .cta-amber { background:#F59E0B; color:#1E1B4B!important; }
  .score-box { background:#f5f4f0; border-radius:12px; padding:20px 24px; margin:16px 0; }
  .score-big { font-size:42px; font-weight:800; color:#1E1B4B; line-height:1; }
  .score-label { font-size:13px; color:#6b7280; margin-top:4px; }
  .change-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #e5e7eb; font-size:14px; }
  .change-row:last-child { border-bottom:none; }
  .up { color:#10b981; font-weight:600; }
  .down { color:#ef4444; font-weight:600; }
  .flat { color:#9ca3af; }
  .footer { padding:20px 32px; background:#f5f4f0; font-size:12px; color:#9ca3af; text-align:center; }
  .footer a { color:#9ca3af; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header"><a href="${APP_URL}">GetGrowth</a></div>
  <div class="body">${content}</div>
  <div class="footer">
    GetGrowth · <a href="${APP_URL}">getgrowth.eu</a><br/>
    You're receiving this because you opted in to score change notifications.
    <br/><a href="${APP_URL}/unsubscribe">Unsubscribe</a>
  </div>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template: Lead welcome — sent after email capture on free audit
// ---------------------------------------------------------------------------
export async function sendLeadWelcome(opts: {
  to: string;
  appName: string;
  score: number;
  savedAuditUrl: string;
}) {
  const { to, appName, score, savedAuditUrl } = opts;
  const grade = score >= 80 ? "strong" : score >= 60 ? "decent" : "needs work";

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your ASO audit for ${appName} is saved — score: ${score}/100`,
    html: brand(`
      <h2>Your audit is saved</h2>
      <p>We've saved your ASO audit for <strong>${appName}</strong> so you can come back any time.</p>
      <div class="score-box">
        <div class="score-big">${score}<span style="font-size:20px;color:#9ca3af">/100</span></div>
        <div class="score-label">Overall ASO score · ${grade}</div>
      </div>
      <p>We'll check your listing again weekly and email you if anything changes — a score drop, a ranking shift, or a new opportunity.</p>
      <p>Want to see the full AI-powered analysis with keyword gaps, copy rewrites, and screenshot feedback?</p>
      <a href="${savedAuditUrl}" class="cta cta-amber">View your saved audit →</a>
      <p style="font-size:13px;color:#9ca3af">One-time payment · No subscription · €29</p>
    `),
  });
}

// ---------------------------------------------------------------------------
// Template: Lead score change — sent when a lead's app score changes ≥3pts
// ---------------------------------------------------------------------------
export async function sendLeadScoreChange(opts: {
  to: string;
  appName: string;
  previousScore: number;
  newScore: number;
  categoryDiffs: Array<{ category: string; previous: number; current: number }>;
  savedAuditUrl: string;
}) {
  const { to, appName, previousScore, newScore, categoryDiffs, savedAuditUrl } = opts;
  const delta = newScore - previousScore;
  const improved = delta > 0;
  const changed = Math.abs(delta);

  const diffRows = categoryDiffs
    .filter((d) => Math.abs(d.current - d.previous) >= 3)
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
    .slice(0, 5)
    .map((d) => {
      const diff = d.current - d.previous;
      const cls = diff > 0 ? "up" : "down";
      const sign = diff > 0 ? "+" : "";
      return `<div class="change-row"><span>${d.category}</span><span class="${cls}">${sign}${diff} pts</span></div>`;
    })
    .join("");

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${appName} score ${improved ? "improved" : "dropped"} ${changed} pts → ${newScore}/100`,
    html: brand(`
      <h2>Your listing score ${improved ? "went up" : "dropped"}</h2>
      <p><strong>${appName}</strong> was re-checked this week.</p>
      <div class="score-box" style="display:flex;gap:24px;align-items:center">
        <div>
          <div class="score-big" style="color:#9ca3af;font-size:28px">${previousScore}</div>
          <div class="score-label">Before</div>
        </div>
        <div style="font-size:24px;color:#9ca3af">→</div>
        <div>
          <div class="score-big" style="color:${improved ? "#10b981" : "#ef4444"}">${newScore}</div>
          <div class="score-label">Now ${improved ? "↑" : "↓"} ${changed} pts</div>
        </div>
      </div>
      ${diffRows ? `<p style="margin-top:16px"><strong>What changed:</strong></p>${diffRows}` : ""}
      <p style="margin-top:16px">Unlock the full AI audit to get specific recommendations on what to fix.</p>
      <a href="${savedAuditUrl}" class="cta cta-amber">Fix it now — €29 full audit →</a>
    `),
  });
}

// ---------------------------------------------------------------------------
// Template: Score regression — sent to logged-in users when score drops ≥5pts
// ---------------------------------------------------------------------------
export async function sendScoreRegression(opts: {
  to: string;
  appName: string;
  previousScore: number;
  newScore: number;
  categoryDiffs: Array<{ category: string; previous: number; current: number }>;
  appDetailUrl: string;
}) {
  const { to, appName, previousScore, newScore, categoryDiffs, appDetailUrl } = opts;
  const delta = newScore - previousScore;

  const diffRows = categoryDiffs
    .filter((d) => Math.abs(d.current - d.previous) >= 3)
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
    .slice(0, 5)
    .map((d) => {
      const diff = d.current - d.previous;
      const cls = diff > 0 ? "up" : "down";
      const sign = diff > 0 ? "+" : "";
      return `<div class="change-row"><span>${d.category}</span><span class="${cls}">${sign}${diff} pts</span></div>`;
    })
    .join("");

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${appName} listing score dropped ${Math.abs(delta)} pts — action needed`,
    html: brand(`
      <h2>Your listing score dropped</h2>
      <p>We re-checked <strong>${appName}</strong> and noticed a significant change.</p>
      <div class="score-box" style="display:flex;gap:24px;align-items:center">
        <div>
          <div class="score-big" style="color:#9ca3af;font-size:28px">${previousScore}</div>
          <div class="score-label">2 weeks ago</div>
        </div>
        <div style="font-size:24px;color:#9ca3af">→</div>
        <div>
          <div class="score-big" style="color:#ef4444">${newScore}</div>
          <div class="score-label">Now ↓ ${Math.abs(delta)} pts</div>
        </div>
      </div>
      ${diffRows ? `<p style="margin-top:16px"><strong>Affected areas:</strong></p>${diffRows}` : ""}
      <a href="${appDetailUrl}" class="cta" style="margin-top:16px">View full breakdown →</a>
    `),
  });
}

// ---------------------------------------------------------------------------
// Template: Rank alert digest — sent to paid users for keyword rank moves
// ---------------------------------------------------------------------------
export async function sendRankAlertDigest(opts: {
  to: string;
  alerts: Array<{
    appName: string;
    keyword: string;
    country: string;
    previousRank: number | null;
    currentRank: number | null;
    delta: number; // positive = improved
  }>;
  dashboardUrl: string;
}) {
  const { to, alerts, dashboardUrl } = opts;

  const rows = alerts
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 10)
    .map((a) => {
      const improved = a.delta > 0;
      const cls = improved ? "up" : "down";
      const rankStr = a.currentRank != null ? `#${a.currentRank}` : "Not ranked";
      const prevStr = a.previousRank != null ? `#${a.previousRank}` : "—";
      return `<div class="change-row">
        <div>
          <strong style="color:#1E1B4B">${a.keyword}</strong>
          <span style="color:#9ca3af;font-size:12px"> · ${a.appName} · ${a.country.toUpperCase()}</span>
        </div>
        <span class="${cls}">${prevStr} → ${rankStr}</span>
      </div>`;
    })
    .join("");

  const wins = alerts.filter((a) => a.delta > 0).length;
  const drops = alerts.filter((a) => a.delta < 0).length;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Keyword rank update: ${wins} up, ${drops} down`,
    html: brand(`
      <h2>Your keyword ranks moved</h2>
      <p>${wins} keyword${wins !== 1 ? "s" : ""} improved, ${drops} dropped since yesterday.</p>
      ${rows}
      <a href="${dashboardUrl}" class="cta" style="margin-top:20px">View all keywords →</a>
    `),
  });
}
