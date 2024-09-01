# grammy-tap

A middleware for [grammY](https://grammy.dev/) that sends updates to a
configured server. It also has a UI available at the
[grammy-tap-ui](https://github.com/yourusername/grammy-tap-ui) repository on
GitHub.

## Installation

To use this module in your Deno project:

```ts
import { tap } from "https://deno.land/x/grammy-tap/mod.ts";
```

## Usage

### Combined Tap (Updates and API)

Here's a basic example of how to use the combined `tap` middleware with grammY:

```ts
import { Bot } from "https://deno.land/x/grammy/mod.ts";
import { tap } from "https://deno.land/x/grammy-tap/mod.ts";

const bot = new Bot(Deno.env.get("TELEGRAM_TOKEN") ?? "");

// Add the combined tap middleware
bot.use(tap({ serverUrl: Deno.env.get("TAP_SERVER_URL") ?? "" }));

// Your bot logic here
bot.command("start", (ctx) => ctx.reply("Hello, world!"));

bot.start();
```

### Individual Tap Functions

You can also use the update tap and API tap functions separately for more
granular control:

#### Update Tap

The `udpateTap` function can be used to tap into updates received by your bot:

```ts
import { Bot } from "https://deno.land/x/grammy/mod.ts";
import { udpateTap } from "https://deno.land/x/grammy-tap/mod.ts";

const bot = new Bot(Deno.env.get("TELEGRAM_TOKEN") ?? "");

// Add the update tap middleware
bot.use(udpateTap({ serverUrl: Deno.env.get("TAP_SERVER_URL") ?? "" }));

// Your bot logic here
bot.command("start", (ctx) => ctx.reply("Hello, world!"));

bot.start();
```

#### API Tap

The `apiTap` function can be used to tap into API requests made by your bot:

```ts
import { Bot } from "https://deno.land/x/grammy/mod.ts";
import { apiTap } from "https://deno.land/x/grammy-tap/mod.ts";

const bot = new Bot(Deno.env.get("TELEGRAM_TOKEN") ?? "");

// Add the API tap transformer
bot.api.config.use(apiTap(Deno.env.get("TAP_SERVER_URL") ?? ""));

// Your bot logic here
bot.command("start", (ctx) => ctx.reply("Hello, world!"));

bot.start();
```

These individual tap functions allow you to choose which aspects of your bot's
operation you want to monitor with Tap.

## Configuration

The `tap` and `updateTap` functions accept an options object with the following
properties:

- `serverUrl` (required): The URL of your Tap server.
- `tapErrors` (optional): A boolean indicating whether to send errors to the tap
  server. Defaults to `true`.
- `customProperties` (optional): A function that takes the context (`ctx`) as an
  argument and returns a record of custom properties to send with each update.
  This allows you to include additional information with your tapped data.

Example usage with all options:

```ts
bot.use(tap({
  serverUrl: Deno.env.get("TAP_SERVER_URL") ?? "",
  tapErrors: true,
  customProperties: (ctx) => ({
    userId: ctx.from?.id,
    chatType: ctx.chat?.type,
    // Add any other custom properties you want to include
  }),
}));
```

This configuration will send all updates and errors to the tap server, along
with custom properties for each update.

## License

[MIT License](LICENSE)
