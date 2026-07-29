import Fastory from "./class/Fastory";

function main() {
  const fastory = new Fastory();
  const port = Number(process.env.PORT) || 3000;

  fastory.start(port);
}

main();