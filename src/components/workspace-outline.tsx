'use client';

import { createContext, useContext, type Dispatch, type SetStateAction } from 'react';

export type WorkspaceSection = { id: string; title: string };
export const WorkspaceOutlineContext = createContext<{
  sections: WorkspaceSection[];
  setSections: Dispatch<SetStateAction<WorkspaceSection[]>>;
} | null>(null);

export function useWorkspaceOutline() {
  return useContext(WorkspaceOutlineContext);
}
