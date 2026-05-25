import { siteName } from "../config/site";

export type ShareResult = "shared" | "copied" | "cancelled";

export async function shareFlowUrl(title: string, url = window.location.href) {
  if (navigator.share) {
    try {
      await navigator.share({ title: title || siteName, url });
      return "shared" satisfies ShareResult;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled" satisfies ShareResult;
      }

      throw error;
    }
  }

  await navigator.clipboard.writeText(url);
  return "copied" satisfies ShareResult;
}
