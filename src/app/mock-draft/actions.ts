"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  teamSlotForPick,
  totalRounds,
  pickForTeam,
  type RosterSettings,
  type CandidatePlayer,
} from "@/lib/mockDraftEngine";
import { getOrCreateLeagueSettings } from "@/lib/leagueSettings";

export { getOrCreateLeagueSettings };

function intField(formData: FormData, name: string, fallback: number): number {
  const raw = formData.get(name);
  const n = raw ? parseInt(String(raw), 10) : NaN;
  return Number.isNaN(n) ? fallback : n;
}

export async function saveLeagueSettings(formData: FormData): Promise<void> {
  const numTeams = Math.max(2, Math.min(20, intField(formData, "numTeams", 12)));
  const myDraftSlot = Math.max(1, Math.min(numTeams, intField(formData, "myDraftSlot", 1)));
  const managerNames = formData
    .getAll("managerNames")
    .map((v) => String(v).trim())
    .slice(0, numTeams);
  while (managerNames.length < numTeams) managerNames.push("");
  const data = {
    numTeams,
    myDraftSlot,
    managerNames,
    qbSlots: Math.max(0, intField(formData, "qbSlots", 1)),
    rbSlots: Math.max(0, intField(formData, "rbSlots", 2)),
    wrSlots: Math.max(0, intField(formData, "wrSlots", 2)),
    teSlots: Math.max(0, intField(formData, "teSlots", 1)),
    flexSlots: Math.max(0, intField(formData, "flexSlots", 1)),
    kSlots: Math.max(0, intField(formData, "kSlots", 1)),
    dstSlots: Math.max(0, intField(formData, "dstSlots", 1)),
    benchSlots: Math.max(0, intField(formData, "benchSlots", 6)),
  };

  const existing = await prisma.leagueSettings.findFirst();
  if (existing) {
    await prisma.leagueSettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.leagueSettings.create({ data });
  }
  revalidatePath("/mock-draft");
}

// Runs computer picks starting at `startingOverallPick` until either the
// user's team is on the clock or the draft runs out of rounds, mutating
// `rosterByTeam` / `pickedPlayerIds` in place and writing the new picks in
// one batched insert.
async function simulateUntilUserTurn(
  mockDraftId: string,
  settings: RosterSettings,
  startingOverallPick: number,
  rosterByTeam: Map<number, { position: string }[]>,
  pickedPlayerIds: Set<string>,
  allPlayers: CandidatePlayer[]
): Promise<{ completed: boolean }> {
  const totalPicks = totalRounds(settings) * settings.numTeams;
  const newPicks: Prisma.MockDraftPickCreateManyInput[] = [];
  let overallPick = startingOverallPick;

  while (overallPick <= totalPicks) {
    const { round, teamSlot } = teamSlotForPick(overallPick, settings.numTeams);
    if (teamSlot === settings.myDraftSlot) break;

    const available = allPlayers.filter((p) => !pickedPlayerIds.has(p.id));
    const roster = rosterByTeam.get(teamSlot) ?? [];
    const chosen = pickForTeam(available, roster, settings);
    if (!chosen) break;

    pickedPlayerIds.add(chosen.id);
    if (!rosterByTeam.has(teamSlot)) rosterByTeam.set(teamSlot, []);
    rosterByTeam.get(teamSlot)!.push({ position: chosen.position });

    newPicks.push({
      mockDraftId,
      overallPick,
      round,
      teamSlot,
      isUser: false,
      playerId: chosen.id,
      playerName: chosen.name,
      position: chosen.position,
      nflTeam: chosen.team,
    });
    overallPick++;
  }

  if (newPicks.length > 0) {
    await prisma.mockDraftPick.createMany({ data: newPicks });
  }

  return { completed: overallPick > totalPicks };
}

export async function startMockDraft(): Promise<never> {
  const settings = await getOrCreateLeagueSettings();

  const mockDraft = await prisma.mockDraft.create({
    data: {
      numTeams: settings.numTeams,
      myDraftSlot: settings.myDraftSlot,
      managerNames: settings.managerNames,
      qbSlots: settings.qbSlots,
      rbSlots: settings.rbSlots,
      wrSlots: settings.wrSlots,
      teSlots: settings.teSlots,
      flexSlots: settings.flexSlots,
      kSlots: settings.kSlots,
      dstSlots: settings.dstSlots,
      benchSlots: settings.benchSlots,
    },
  });

  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, position: true, team: true, overallRank: true, espnAdp: true, sleeperAdp: true, tier: true },
  });

  const { completed } = await simulateUntilUserTurn(mockDraft.id, mockDraft, 1, new Map(), new Set(), allPlayers);
  if (completed) {
    await prisma.mockDraft.update({ where: { id: mockDraft.id }, data: { completed: true } });
  }

  revalidatePath("/mock-draft");
  redirect(`/mock-draft/${mockDraft.id}`);
}

export async function makeMockPick(formData: FormData): Promise<void> {
  const mockDraftId = String(formData.get("mockDraftId"));
  const playerId = String(formData.get("playerId"));

  const mockDraft = await prisma.mockDraft.findUnique({ where: { id: mockDraftId } });
  if (!mockDraft || mockDraft.completed) return;

  const existingPicks = await prisma.mockDraftPick.findMany({
    where: { mockDraftId },
    orderBy: { overallPick: "asc" },
  });

  const nextOverallPick = existingPicks.length + 1;
  const { round, teamSlot } = teamSlotForPick(nextOverallPick, mockDraft.numTeams);
  if (teamSlot !== mockDraft.myDraftSlot) return; // stale UI / double-submit guard

  const pickedPlayerIds = new Set(existingPicks.map((p) => p.playerId));
  if (pickedPlayerIds.has(playerId)) return;

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { id: true, name: true, position: true, team: true },
  });
  if (!player) return;

  await prisma.mockDraftPick.create({
    data: {
      mockDraftId,
      overallPick: nextOverallPick,
      round,
      teamSlot,
      isUser: true,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      nflTeam: player.team,
    },
  });
  pickedPlayerIds.add(player.id);

  const rosterByTeam = new Map<number, { position: string }[]>();
  for (const p of existingPicks) {
    if (!rosterByTeam.has(p.teamSlot)) rosterByTeam.set(p.teamSlot, []);
    rosterByTeam.get(p.teamSlot)!.push({ position: p.position });
  }
  if (!rosterByTeam.has(teamSlot)) rosterByTeam.set(teamSlot, []);
  rosterByTeam.get(teamSlot)!.push({ position: player.position });

  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, position: true, team: true, overallRank: true, espnAdp: true, sleeperAdp: true, tier: true },
  });

  const { completed } = await simulateUntilUserTurn(
    mockDraftId,
    mockDraft,
    nextOverallPick + 1,
    rosterByTeam,
    pickedPlayerIds,
    allPlayers
  );

  if (completed) {
    await prisma.mockDraft.update({ where: { id: mockDraftId }, data: { completed: true } });
  }

  revalidatePath(`/mock-draft/${mockDraftId}`);
  revalidatePath("/mock-draft");
}

export async function deleteMockDraft(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await prisma.mockDraft.delete({ where: { id } });
  revalidatePath("/mock-draft");
}
