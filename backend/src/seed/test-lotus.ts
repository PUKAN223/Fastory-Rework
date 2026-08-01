async function inspectLotusElements() {
  const url = "https://www.lotuss.com/th/category/snack-and-instant-food-deal";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
  });
  const html = await res.text();
  console.log("HTML length:", html.length);

  // Look for product names or titles in tags
  const hTags = html.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/g) || [];
  console.log("H1-H4 tags count:", hTags.length);
  console.log("Sample H tags:", hTags.slice(0, 15));

  // Look for images
  const imgs = html.match(/<img[^>]+src=["']([^"']+)["']/g) || [];
  console.log("Image tags count:", imgs.length);
  const productImgs = imgs.filter(i => i.includes("product") || i.includes("media") || i.includes("o2o-static"));
  console.log("Sample Product Images:", productImgs.slice(0, 10));
}

inspectLotusElements();
