export type OrderedAutosaveContext = {
  fieldKey?: string | undefined;
  fieldVersion?: number | undefined;
};

export function createAutosaveOrder() {
  const fieldVersions = new Map<string, number>();
  const fieldQueues = new Map<string, Promise<void>>();

  return {
    begin(fieldKey: string): number {
      const version = (fieldVersions.get(fieldKey) ?? 0) + 1;
      fieldVersions.set(fieldKey, version);
      return version;
    },

    isLatest(context: OrderedAutosaveContext | undefined): boolean {
      if (!context?.fieldKey || context.fieldVersion === undefined) {
        return true;
      }

      return fieldVersions.get(context.fieldKey) === context.fieldVersion;
    },

    async run<TResult>(
      fieldKey: string,
      operation: () => Promise<TResult>
    ): Promise<TResult> {
      const previous = fieldQueues.get(fieldKey) ?? Promise.resolve();
      const current = previous.catch(() => undefined).then(operation);
      const currentBarrier = current.then(
        () => undefined,
        () => undefined
      );

      fieldQueues.set(fieldKey, currentBarrier);

      try {
        return await current;
      } finally {
        if (fieldQueues.get(fieldKey) === currentBarrier) {
          fieldQueues.delete(fieldKey);
        }
      }
    },
  };
}
