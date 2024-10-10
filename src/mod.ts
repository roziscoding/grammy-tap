import { Context, MiddlewareFn, Transformer } from "../deps.deno.ts";

/**
 * Options for the tap middleware.
 */
export type TapOptions<C extends Context> = {
  /**
   * The URL of the tap server.
   */
  serverUrl: string;
  /**
   * Whether to send errors to the tap server.
   */
  tapErrors?: boolean;
  /**
   * Custom properties to send with the update.
   */
  customProperties?: (ctx: C) => Record<string, unknown>;
  /**
   * The session ID to use for the tap server.
   */
  sessionId?: string;
};

export type TapFlavor = {
  tap: {
    uuid: string;
  };
};

function fetchWithUUID(
  uuid: string,
  url: string,
  options: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "x-session-id": uuid,
    },
  });
}

function hasProperty<TProperty extends string>(
  property: TProperty,
  // deno-lint-ignore no-explicit-any
  err: any,
): err is { [k in TProperty]: string } {
  return property in err;
}

/**
 * Taps every request sent to the Telegram API.
 *
 * @param serverUrl - The URL of the tap server.
 * @returns A transformer that sends the request to the tap server.
 */
export const apiTap =
  (serverUrl: string, uuid: string): Transformer =>
  async (prev, method, payload, signal) => {
    const response = await prev(method, payload, signal);

    await fetchWithUUID(uuid, `${serverUrl}/request`, {
      method: "POST",
      body: JSON.stringify({ method, payload, response }),
      signal,
    }).catch((err) =>
      console.error(`Failed to send request to tap server: ${err}`)
    );

    return response;
  };

/**
 * Taps every update received from the Telegram API.
 *
 * @param options - The options for the tap middleware.
 * @returns A middleware that sends the update to the tap server.
 */
export const udpateTap = <C extends Context & TapFlavor>(
  options: TapOptions<C>,
  uuid: string,
): MiddlewareFn<C> =>
async (ctx, next) => {
  ctx.tap = { uuid };
  const { serverUrl, tapErrors = true, customProperties } = options;

  const body = {
    ...customProperties?.(ctx),
    update: ctx.update,
  };

  try {
    await Promise.all([
      next(),
      fetchWithUUID(uuid, `${serverUrl}/update`, {
        method: "POST",
        body: JSON.stringify(body),
      }).catch((err) =>
        console.error(`Failed to send update to tap server: ${err}`)
      ),
    ]);
  } catch (error) {
    if (tapErrors) {
      const body = {
        error: {
          message: hasProperty("message", error)
            ? error.message
            : "No error message",
          name: hasProperty("name", error) ? error.name : "Unknown error",
          stack: hasProperty("stack", error) ? error.stack : "No stack trace",
        },
        ...customProperties?.(ctx),
        update: ctx.update,
      };

      await fetchWithUUID(uuid, `${serverUrl}/botError`, {
        method: "POST",
        body: JSON.stringify(body),
      }).catch((err) =>
        console.error(`Failed to send error to tap server: ${err}`)
      );
    }

    throw error;
  }
};

/**
 * Taps every request and update received from the Telegram API.
 *
 * @param options - The options for the tap middleware.
 * @returns A middleware that sends the request and update to the tap server.
 */
export const tap =
  <C extends Context & TapFlavor>(options: TapOptions<C>): MiddlewareFn<C> =>
  (
    ctx,
    next,
  ) => {
    const uuid = options.sessionId ?? crypto.randomUUID();
    ctx.api.config.use(apiTap(options.serverUrl, uuid));

    return udpateTap(options, uuid)(ctx, next);
  };
