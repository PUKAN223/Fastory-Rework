import fs from "node:fs";
import readline from "node:readline";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function test() {
  const rl = readline.createInterface({
    input: fs.createReadStream("data/amazon_products.csv"),
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) continue; // skip header
    const cols = parseCsvLine(line);
    if (lineCount <= 5) {
      console.log(`Line ${lineCount}:`, {
        asin: cols[0],
        title: cols[1],
        price: cols[6],
        categoryId: cols[8],
        boughtInLastMonth: cols[10],
      });
    } else {
      break;
    }
  }
}

test();
