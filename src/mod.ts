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
};

/**
 * Taps every request sent to the Telegram API.
 *
 * @param serverUrl - The URL of the tap server.
 * @returns A transformer that sends the request to the tap server.
 */
export const apiTap =
  (serverUrl: string): Transformer => async (prev, method, payload, signal) => {
    const response = await prev(method, payload, signal);

    await fetch(`${serverUrl}/request`, {
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
export const udpateTap =
  <C extends Context>(options: TapOptions<C>): MiddlewareFn<C> =>
  async (ctx, next) => {
    const { serverUrl, tapErrors = true, customProperties } = options;

    const body = {
      ...customProperties?.(ctx),
      update: ctx.update,
    };

    try {
      await Promise.all([
        next(),
        fetch(`${serverUrl}/update`, {
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
            message: error.message ?? "No error message",
            name: error.name ?? "Unknown error",
            stack: error.stack ?? "No stack trace",
          },
          ...customProperties?.(ctx),
          update: ctx.update,
        };

        await fetch(`${serverUrl}/botError`, {
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
  <C extends Context>(options: TapOptions<C>): MiddlewareFn<C> =>
  (
    ctx,
    next,
  ) => {
    ctx.api.config.use(apiTap(options.serverUrl));

    return udpateTap(options)(ctx, next);
  };
