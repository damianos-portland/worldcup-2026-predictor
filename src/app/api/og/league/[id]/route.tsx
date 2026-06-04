import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MEDALS = ["🥇", "🥈", "🥉"];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const league = await prisma.league.findUnique({ where: { id: params.id } });
  if (!league) return new Response("Not found", { status: 404 });

  const top = await prisma.membership.findMany({
    where: { leagueId: params.id },
    orderBy: [{ totalPoints: "desc" }, { joinedAt: "asc" }],
    take: 3,
    include: { user: true },
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #070b16 0%, #11192e 100%)",
          color: "#F5F2EA",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "30px" }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#F5C451", textTransform: "uppercase" }}>
            World Cup 2026 · Predictor League
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, marginTop: 6 }}>{league.name}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", flex: 1, justifyContent: "center" }}>
          {top.map((t, i) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "22px 34px",
                borderRadius: 24,
                background: i === 0 ? "rgba(245,196,81,0.14)" : "rgba(255,255,255,0.04)",
                border: i === 0 ? "2px solid rgba(245,196,81,0.5)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
                <div style={{ display: "flex", fontSize: 52 }}>{MEDALS[i]}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 42, fontWeight: 700 }}>{t.teamName}</div>
                  <div style={{ display: "flex", fontSize: 24, color: "#9aa3b2" }}>{t.user.name}</div>
                </div>
              </div>
              <div style={{ display: "flex", fontSize: 48, fontWeight: 800, color: "#F5C451" }}>{t.totalPoints} pts</div>
            </div>
          ))}
          {top.length === 0 && (
            <div style={{ display: "flex", fontSize: 32, color: "#9aa3b2" }}>No standings yet — be the first to climb the table!</div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#9aa3b2", marginTop: 10 }}>
          Join with code {league.code}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
