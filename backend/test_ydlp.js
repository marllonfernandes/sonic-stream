const ytDlp = require("yt-dlp-exec");

async function test() {
  const url = "https://www.youtube.com/watch?v=0ZF5em0MTwY";
  try {
    console.log("Testing with googlebot header...");
    await ytDlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: ["referer:youtube.com", "user-agent:googlebot"],
    });
    console.log("Success with googlebot header!");
  } catch (err) {
    console.log("Failed with googlebot header:", err.message);
  }

  try {
    console.log("\\nTesting without googlebot header...");
    await ytDlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
    });
    console.log("Success without googlebot header!");
  } catch (err) {
    console.log("Failed without googlebot header:", err.message);
  }

  try {
    console.log("\\nTesting with android client...");
    await ytDlp(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      extractorArgs: "youtube:player_client=android",
    });
    console.log("Success with android client!");
  } catch (err) {
    console.log("Failed with android client:", err.message);
  }
}

test();
