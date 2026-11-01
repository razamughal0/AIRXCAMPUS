export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureDatabaseReady } = await import("@/db/bootstrap");
      await ensureDatabaseReady();
    } catch (err) {
      console.error("[AIR CAMPUS X] Startup DB bootstrap warning:", err);
    }
  }
}
