declare namespace chrome {
  namespace runtime {
    const lastError: { message?: string } | undefined;
    function sendMessage<TResponse = unknown>(
      message: unknown,
      callback?: (response: TResponse) => void
    ): void;
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };
    function openOptionsPage(): void;
  }

  namespace storage {
    const sync: {
      get<T extends Record<string, unknown>>(
        defaults: T,
        callback: (items: T) => void
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
    };
    const local: {
      get<T extends Record<string, unknown>>(
        keys: string | string[] | Record<string, unknown>,
        callback: (items: Record<string, unknown>) => void
      ): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
    };
  }
}
