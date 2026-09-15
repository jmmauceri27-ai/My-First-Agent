export const dynamic = "force-dynamic";

import { listFieldClasses } from "@/lib/fieldsDal";
import FieldsClient from "./FieldsClient";

export default async function FieldsPage() {
  const classes = await listFieldClasses();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">💼 CRM · Fields</h1>
      <FieldsClient classes={classes} />
    </div>
  );
}
