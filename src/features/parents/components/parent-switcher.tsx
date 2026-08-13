"use client";

import { selectParentAction } from "../actions/select-parent.action";
import type { ParentWithChildren } from "../queries/list-parents-with-children";

/** A Client Component only so the select can submit on change. */
export function ParentSwitcher({
  parents,
  selectedParentId,
}: {
  parents: ParentWithChildren[];
  selectedParentId: number | null;
}) {
  return (
    <form
      action={selectParentAction}
      className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 shadow-sm"
    >
      <label htmlFor="parentId" className="text-xs text-muted">
        Viewing as
      </label>

      <select
        id="parentId"
        name="parentId"
        // Load-bearing: defaultValue only applies on mount, so without a key
        // tied to the server value this select keeps whatever the user picked
        // and can disagree with the children rendered below it.
        key={selectedParentId ?? "none"}
        defaultValue={selectedParentId ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="cursor-pointer bg-transparent text-sm font-medium outline-none"
      >
        <option value="" disabled>
          Select a parent…
        </option>

        {parents.map((parent) => (
          <option key={parent.id} value={parent.id}>
            {parent.name}
          </option>
        ))}
      </select>

      <noscript>
        <button type="submit" className="text-sm underline">
          Switch
        </button>
      </noscript>
    </form>
  );
}
