import { useSyncExternalStore } from "use-sync-external-store/shim";
import { shallowCompare } from "./lib";

export class Store<State extends object> {
    protected state: State;
    private snapshot: State & this;
    private listeners: Set<() => void> = new Set();

    constructor(initialState: State) {
        this.state = initialState;
        this.snapshot = this.createSnapshot(initialState);
    }

    private createSnapshot(newState: State): State & this {
        const snapshot = Object.create(this);
        return Object.assign(snapshot, newState);
    }

    protected setState = (partial: Partial<State>) => {
        const nextState = { ...this.state, ...partial };
        if (!shallowCompare(this.state, nextState)) {
            this.state = nextState;
            // Create a new reference for React to detect the change
            this.snapshot = this.createSnapshot(this.state);
            this.notify();
        }
    };

    private subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    private notify = () => {
        this.listeners.forEach((l) => l());
    };

    public use(): State & this {
        return useSyncExternalStore(this.subscribe, () => this.snapshot);
    }
}
