"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Button from "@/components/ui/Button";
import { OPPORTUNITY_STAGES } from "@/lib/crmTypes";
import type { Company, Contact, Opportunity, OpportunityStage } from "@/lib/crmTypes";
import { moveOpportunityStageAction } from "./actions";
import KanbanColumn from "./KanbanColumn";
import OpportunityCard from "./OpportunityCard";
import OpportunityModal from "./OpportunityModal";

export default function KanbanBoard({
  opportunities,
  companies,
  contacts,
}: {
  opportunities: Opportunity[];
  companies: Company[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [optimisticStage, setOptimisticStage] = useState<Record<string, OpportunityStage>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creatingInStage, setCreatingInStage] = useState<OpportunityStage | null>(null);

  const grouped: Record<OpportunityStage, Opportunity[]> = Object.fromEntries(
    OPPORTUNITY_STAGES.map((s) => [s, [] as Opportunity[]]),
  ) as Record<OpportunityStage, Opportunity[]>;

  for (const o of opportunities) {
    const stage = optimisticStage[o.id] ?? o.stage;
    grouped[stage].push(o);
  }

  const activeOpportunity = activeId ? opportunities.find((o) => o.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const opportunityId = String(active.id);
    const newStage = String(over.id) as OpportunityStage;
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp || (optimisticStage[opportunityId] ?? opp.stage) === newStage) return;

    setOptimisticStage((prev) => ({ ...prev, [opportunityId]: newStage }));
    await moveOpportunityStageAction(opportunityId, newStage);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreatingInStage(OPPORTUNITY_STAGES[0])}>+ New opportunity</Button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {OPPORTUNITY_STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              opportunities={grouped[stage]}
              onCardClick={(o) => router.push(`/crm/opportunities/${o.id}`)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOpportunity ? <OpportunityCard opportunity={activeOpportunity} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {creatingInStage && (
        <OpportunityModal
          opportunity={null}
          companies={companies}
          contacts={contacts}
          defaultStage={creatingInStage}
          onClose={() => setCreatingInStage(null)}
        />
      )}
    </div>
  );
}
