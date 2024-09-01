import { Bot } from "../deps.deno.ts";
import { tap } from "./mod.ts";
const bot = new Bot(Deno.env.get("TELEGRAM_TOKEN") ?? "");

bot.use(
  tap({ serverUrl: Deno.env.get("TAP_SERVER_URL") ?? "", errors: "swallow" }),
);

bot.command("start", (ctx) => ctx.reply("Hello, world!"));

bot.command("error", (_) => {
  throw new Error("This is a test error");
});

bot.on("message:text", (ctx) => {
  ctx.reply("You said: " + ctx.message.text);
});

bot.start();
