import cron from "node-cron";
import { runDailyChecks, runWelcomeChecks } from "../src/lib/jobs";

console.log("Employee lifecycle scheduler started. Daily checks run at 08:00, welcome checks at 11:00.");

cron.schedule("0 8 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running daily checks...`);
  try {
    await runDailyChecks();
    console.log("Daily checks complete.");
  } catch (err) {
    console.error("Daily checks failed:", err);
  }
});

cron.schedule("0 11 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running welcome checks...`);
  try {
    await runWelcomeChecks();
    console.log("Welcome checks complete.");
  } catch (err) {
    console.error("Welcome checks failed:", err);
  }
});
