import { Bot, Context } from "../deps.deno.ts";
import { tap, TapFlavor } from "./mod.ts";

type AppContext = Context & TapFlavor;

const sessionId = crypto.randomUUID();

const bot = new Bot<AppContext>(Deno.env.get("TELEGRAM_TOKEN") ?? "");

bot.use(async (_, next) => {
  await next().catch(() => {});
});

bot.use(
  tap({
    serverUrl: Deno.env.get("TAP_SERVER_URL") ?? "",
    sessionId,
  }),
);

bot.command("start", (ctx) => ctx.reply("Hello, world!"));

bot.command("error", (_) => {
  throw new Error("This is a test error");
});

bot.on("message:text", (ctx) => {
  ctx.reply("You said: " + ctx.message.text);
});

bot.start({
  onStart: () => {
    console.log(
      `Bot started. Tap URL: ${Deno.env.get("TAP_SERVER_UI_URL")}/${sessionId}`,
    );
  },
});
