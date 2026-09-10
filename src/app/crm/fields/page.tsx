export const dynamic = "force-dynamic";

import { listFieldClasses } from "@/lib/fieldsDal";
import { FIELD_OBJECT_TYPES } from "@/lib/crmTypes";
import CrmNav from "../CrmNav";
import FieldsClient from "./FieldsClient";

export default async function FieldsPage() {
  const classesByType = await Promise.all(FIELD_OBJECT_TYPES.map((t) => listFieldClasses(t)));
  const classes = classesByType.flat();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM</h1>
      <CrmNav active="fields" />
      <FieldsClient classes={classes} />
    </div>
  );
}
