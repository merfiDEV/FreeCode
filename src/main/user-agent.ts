/**
 * Browser fingerprint masking.
 *
 * Electron advertises itself in the User-Agent ("Electron/33 ..."), which some
 * sites treat as an unsupported/automated client. We present a plain Chrome UA
 * matching the Chromium version Electron ships, so the z.ai UI behaves exactly
 * as it does in a normal browser.
 */
export function chromeUserAgent(): string {
  const major = (process.versions.chrome || "130").split(".")[0];
  const platform =
    process.platform === "win32"
      ? "Windows NT 10.0; Win64; x64"
      : process.platform === "darwin"
        ? "Macintosh; Intel Mac OS X 10_15_7"
        : "X11; Linux x86_64";
  return (
    "Mozilla/5.0 (" + platform + ") AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/" + major + ".0.0.0 Safari/537.36"
  );
}

/** sec-ch-ua brand list advertising only Google Chrome. */
function chromeBrandList(): string {
  const major = (process.versions.chrome || "130").split(".")[0];
  return '"Google Chrome";v="' + major + '", "Chromium";v="' + major + '", "Not?A_Brand";v="24"';
}

/**
 * Apply the mask to the whole app.
 * Must run before the first window / network request is created.
 */
export function applyUserAgentMask(app: Electron.App): void {
  const ua = chromeUserAgent();
  app.userAgentFallback = ua;

  // Client Hints (sec-ch-ua) otherwise expose the Electron brand.
  app.on("web-contents-created", (_event, contents) => {
    contents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      if (headers["sec-ch-ua"]) headers["sec-ch-ua"] = chromeBrandList();
      if (headers["sec-ch-ua-full-version-list"]) headers["sec-ch-ua-full-version-list"] = chromeBrandList();
      if (headers["User-Agent"]) headers["User-Agent"] = ua;
      callback({ requestHeaders: headers });
    });
  });

  console.log("[freecode] User-Agent masked as Chrome:", ua);
}
