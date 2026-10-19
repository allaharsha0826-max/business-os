import { resetDemo } from "../src/lib/store";

async function main() {
  await resetDemo();
  console.log("Demo data reset.");
  console.log("Open http://127.0.0.1:3000");
  console.log("Founder desk password: demo");
  console.log("Bot API key: dev-bot-key");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
