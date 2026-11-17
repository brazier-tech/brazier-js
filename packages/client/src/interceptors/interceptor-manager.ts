import type { BrazierInterceptorId } from "../types/interceptor.types.js";

/**
 * Stores interceptors and provides registration/removal operations.
 * Execution order is insertion order.
 */
export class InterceptorManager<THandler> {
    private readonly handlers = new Map<BrazierInterceptorId, THandler>();
    private nextId = 0;

    /** 
     * Registers a new intercept handler.
     * @param handler Intercept handler function.
     * @returns Registered intercept handler's ID.
    */
    use(handler: THandler): BrazierInterceptorId {
        if (typeof handler !== "function") {
            throw new TypeError("An interceptor must be a function.");
        }

        const id = this.nextId++;
        this.handlers.set(id, handler);
        return id;
    }

    /**
     * Removes a previously registered handler.
     * @param id handler ID.
     */
    eject(id: BrazierInterceptorId): void {
        this.handlers.delete(id);
    }

    /**
     * Removes every registered handler.
     */
    clear(): void {
        this.handlers.clear();
    }

    /**
     * @returns IDs of all currently registered handlers in order of their addition.
     */
    getHandlers(): THandler[] {
        return Array.from(this.handlers.values());
    }

    get size(): number {
        return this.handlers.size;
    }
}
