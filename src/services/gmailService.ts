import { getAccessToken } from "./googleAuth";

export interface GmailMessageItem {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  ingested?: boolean;
}

function decodeBase64Url(str: string): string {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    return "";
  }
}

function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts) {
        const sub = extractBody(part);
        if (sub) return sub;
      }
    }
  }
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  return "";
}

export async function fetchRecentGmailMessages(maxResults = 5): Promise<GmailMessageItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("No active Google access token. Please sign in with Google first.");
  }

  // 1. List messages from INBOX
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=in:inbox`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API error: ${listRes.status} ${errText}`);
  }

  const listData = await listRes.json();
  if (!listData.messages || !Array.isArray(listData.messages)) {
    return [];
  }

  // 2. Fetch full details for each message
  const items: GmailMessageItem[] = [];

  for (const msg of listData.messages) {
    try {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!detailRes.ok) continue;

      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];

      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
      const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "No Subject";
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";

      let bodyText = extractBody(detail.payload);
      if (!bodyText) {
        bodyText = detail.snippet || "";
      }

      items.push({
        id: detail.id,
        threadId: detail.threadId,
        from: fromHeader,
        subject: subjectHeader,
        date: dateHeader,
        snippet: detail.snippet || "",
        body: bodyText.trim(),
      });
    } catch (err) {
      console.warn(`Could not load email ${msg.id}:`, err);
    }
  }

  return items;
}

export async function ingestGmailEmailToResolveAI(email: GmailMessageItem): Promise<any> {
  const cleanFrom = email.from;
  const emailMatch = cleanFrom.match(/<([^>]+)>/);
  const senderEmail = emailMatch ? emailMatch[1] : cleanFrom;
  const senderName = cleanFrom.replace(/<[^>]+>/, "").trim() || senderEmail;

  const res = await fetch("/api/complaints/incoming", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "Gmail",
      senderName,
      senderEmail,
      subject: email.subject,
      message: email.body || email.snippet,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to ingest email into database.");
  }

  return await res.json();
}
