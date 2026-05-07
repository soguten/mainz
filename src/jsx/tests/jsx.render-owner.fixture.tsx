import type { RenderOwner } from "../render-owner.ts";

export type NamedOwner = RenderOwner & {
  id: string;
  calls: number;
};

export function createOwner(id: string): NamedOwner {
  return {
    id,
    calls: 0,
    registerDOMEvent(): void {
      this.calls += 1;
    },
  };
}
