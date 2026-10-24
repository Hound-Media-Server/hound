const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function convertDateToReadable(date_str: any) {
  var temp_date = date_str.split("-");
  return (
    temp_date[2] + " " + months[Number(temp_date[1]) - 1] + " " + temp_date[0]
  );
}

// in insecure contexts, navigator.clipboard is not available, fallback
export async function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand("copy");
      if (!successful) {
        throw new Error("copy command was unsuccessful");
      }
    } catch (err) {
      throw err;
    } finally {
      textArea.remove();
    }
  }
}

const ONE_MONTH_SECONDS = 30 * 24 * 60 * 60;

export function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff > ONE_MONTH_SECONDS) {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  const ago = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (diff < 300) return "just now";
  if (diff < 1800) return "a few minutes ago";
  if (diff < 3600) return ago(Math.floor(diff / 60), "minute");
  if (diff < 86400) return ago(Math.floor(diff / 3600), "hour");
  if (diff < 604800) return ago(Math.floor(diff / 86400), "day");
  return ago(Math.floor(diff / 604800), "week");
}
