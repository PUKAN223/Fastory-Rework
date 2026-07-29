import { translate } from "@vitalets/google-translate-api";

async function test() {
  const res = await translate("Wireless RGB Gaming Mouse", { to: "th" });
  console.log("Translated:", res.text);
}

test().catch(console.error);
