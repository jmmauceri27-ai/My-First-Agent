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
import { downloadBase64Xlsx } from "@/lib/downloadXlsx";
import type { DatasetRecord } from "@/lib/types";
import { OPPORTUNITY_STAGES } from "@/lib/crmTypes";
import type { Company, Contact, Employee, Opportunity, OpportunityStage } from "@/lib/crmTypes";
import { exportPipelineToExcelAction, moveOpportunityStageAction } from "./actions";
import KanbanColumn from "./KanbanColumn";
import OpportunityCard from "./OpportunityCard";
import OpportunityModal from "./OpportunityModal";

const PIPELINE_EXPORT_COLUMNS = [
  "Opportunity",
  "Client",
  "Stage",
  "Amount",
  "Site Count",
  "Work Type",
  "Expected Close Date",
  "Sales Manager",
  "Notes",
  "Created",
];

function opportunityToExportRow(o: Opportunity): DatasetRecord {
  return {
    Opportunity: o.name,
    Client: o.companyName ?? "",
    Stage: o.stage,
    Amount: o.amount,
    "Site Count": o.siteCount,
    "Work Type": o.workType ?? "",
    "Expected Close Date": o.expectedCloseDate ?? "",
    "Sales Manager": o.salesManagerName ?? "",
    Notes: o.notes ?? "",
    Created: o.createdAt,
  };
}

export default function KanbanBoard({
  opportunities,
  companies,
  contacts,
  employees,
}: {
  opportunities: Opportunity[];
  companies: Company[];
  contacts: Contact[];
  employees: Employee[];
}) {
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [optimisticStage, setOptimisticStage] = useState<Record<string, OpportunityStage>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creatingInStage, setCreatingInStage] = useState<OpportunityStage | null>(null);
  const [exporting, setExporting] = useState(false);

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

  async function handleExport() {
    if (opportunities.length === 0) return;
    setExporting(true);
    try {
      const rows = opportunities.map(opportunityToExportRow);
      const base64 = await exportPipelineToExcelAction(rows, PIPELINE_EXPORT_COLUMNS);
      const date = new Date().toISOString().slice(0, 10);
      downloadBase64Xlsx(base64, `crm_pipeline_${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={handleExport} disabled={opportunities.length === 0 || exporting}>
          {exporting ? "Downloading…" : "Download pipeline (.xlsx)"}
        </Button>
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
          employees={employees}
          defaultStage={creatingInStage}
          onClose={() => setCreatingInStage(null)}
        />
      )}
    </div>
  );
}
