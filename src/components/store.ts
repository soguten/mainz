import type { NoState } from "./types.ts";

export interface StoreBoundComponent {
  isConnected: boolean;
  rerender(): void;
}

const STORE_STATE = new WeakMap<Store<unknown>, unknown>();
const STORE_STATE_INITIALIZED = new WeakSet<Store<unknown>>();
const STORE_BOUND_COMPONENTS = new WeakMap<
  Store<unknown>,
  Set<StoreBoundComponent>
>();
const COMPONENT_BOUND_STORES = new WeakMap<
  StoreBoundComponent,
  Set<Store<unknown>>
>();

/**
 * Runtime base class for app-scoped shared UI state.
 *
 * Stores own shared app-visible state and actions. Components may bind to a store when they render
 * from `store.state` and expect Mainz to rerender them after store state changes.
 *
 * Use `Store` for app-scoped shared state. Keep `Component.load()` for component-owned async data
 * and keep services responsible for data access and infrastructure work.
 */
export abstract class Store<State = NoState> {
  /**
   * The current public store state.
   *
   * Mainz initializes store state lazily on first read or first write so stores can stay aligned
   * with the `initState()` teaching story used by components.
   */
  public get state(): State {
    this.ensureStateInitialized();
    return STORE_STATE.get(this as Store<unknown>) as State;
  }

  /**
   * Updates the store state and rerenders any currently bound components.
   *
   * This setter is public so store subclasses can continue using `this.state = nextState` in the
   * natural class-first style. The intended ownership model remains that store actions perform
   * these updates.
   */
  public set state(nextState: State) {
    STORE_STATE.set(this as Store<unknown>, nextState);
    STORE_STATE_INITIALIZED.add(this as Store<unknown>);
    this.notifyBoundComponents();
  }

  /**
   * Optional synchronous store state bootstrap.
   *
   * Use `initState()` when the store already knows its initial app-visible state before any async
   * store action runs.
   */
  protected initState?(): State;

  /**
   * Binds a component rerender relationship to this store.
   *
   * Use this only when the component renders from `store.state`. Action-only consumers may inject
   * the store without binding.
   */
  public bind(component: StoreBoundComponent): this {
    const store = this as Store<unknown>;

    let boundComponents = STORE_BOUND_COMPONENTS.get(store);
    if (!boundComponents) {
      boundComponents = new Set<StoreBoundComponent>();
      STORE_BOUND_COMPONENTS.set(store, boundComponents);
    }
    boundComponents.add(component);

    let boundStores = COMPONENT_BOUND_STORES.get(component);
    if (!boundStores) {
      boundStores = new Set<Store<unknown>>();
      COMPONENT_BOUND_STORES.set(component, boundStores);
    }
    boundStores.add(store);

    return this;
  }

  /** Initializes store state once before first use. */
  private ensureStateInitialized(): void {
    const store = this as Store<unknown>;
    if (STORE_STATE_INITIALIZED.has(store)) {
      return;
    }

    if (this.initState) {
      STORE_STATE.set(store, this.initState());
    }

    STORE_STATE_INITIALIZED.add(store);
  }

  /** Rerenders bound components and prunes bindings for detached owners. */
  private notifyBoundComponents(): void {
    const store = this as Store<unknown>;
    const boundComponents = STORE_BOUND_COMPONENTS.get(store);
    if (!boundComponents) {
      return;
    }

    for (const component of Array.from(boundComponents)) {
      if (!component.isConnected) {
        this.unbind(component);
        continue;
      }

      component.rerender();
    }
  }

  /** Removes one component binding from this store. */
  private unbind(component: StoreBoundComponent): void {
    const store = this as Store<unknown>;

    const boundComponents = STORE_BOUND_COMPONENTS.get(store);
    boundComponents?.delete(component);
    if (boundComponents?.size === 0) {
      STORE_BOUND_COMPONENTS.delete(store);
    }

    const boundStores = COMPONENT_BOUND_STORES.get(component);
    boundStores?.delete(store);
    if (boundStores?.size === 0) {
      COMPONENT_BOUND_STORES.delete(component);
    }
  }
}

/**
 * Removes any store bindings associated with a component that is leaving the render tree.
 */
export function cleanupStoreBindingsForComponent(
  component: StoreBoundComponent,
): void {
  const boundStores = COMPONENT_BOUND_STORES.get(component);
  if (!boundStores) {
    return;
  }

  for (const store of Array.from(boundStores)) {
    const boundComponents = STORE_BOUND_COMPONENTS.get(store);
    boundComponents?.delete(component);
    if (boundComponents?.size === 0) {
      STORE_BOUND_COMPONENTS.delete(store);
    }
  }

  COMPONENT_BOUND_STORES.delete(component);
}
