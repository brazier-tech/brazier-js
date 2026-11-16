
export class InterceptorManager<T> {
    private handlers = new Map<number, T>();
    private nextId = 0;

    /**
     * Registers a new interceptor or updates an existing one.
     * @param handler function to execute before and after the main logic.
     * @returns a function to unregister the interface.
     */
    use(handler: T): () => void {
        const id = this.nextId;

        this.handlers.set(id, handler);

        // return function to unregister
        return () => {
            this.handlers.delete(id);
        }
    }

    /**
     * @returns an array of all registered handlers.
     */
    getHandlers(): T[] {
        return Array.from(this.handlers.values());
    }

    /**
     * Clears all handlers.
     */
    clear(): void {
        this.handlers.clear()
    }
}