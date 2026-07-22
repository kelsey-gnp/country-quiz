const FLODESK_API = "https://api.flodesk.com/v1";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { ok: false });
  const key = process.env.FLODESK_API_KEY;
  if (!key) return resp(500, { ok: false, error: "FLODESK_API_KEY not set" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return resp(400, { ok: false }); }

  const { email, firstName, segmentId, website, quizResult, countryMatch } = body;
  if (website) return resp(200, { ok: true }); // honeypot: bot filled hidden field
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return resp(400, { ok: false, error: "Invalid email" });
  if (!segmentId) return resp(400, { ok: false, error: "Missing segment ID" });

  const auth = "Basic " + Buffer.from(key + ":").toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };

  const subscriberBody = { email, first_name: firstName || "" };
  if (quizResult || countryMatch) {
    subscriberBody.custom_fields = {};
    if (quizResult) subscriberBody.custom_fields.quiz_result = quizResult;
    if (countryMatch) subscriberBody.custom_fields.country_match = countryMatch;
  }

  try {
    const subRes = await fetch(`${FLODESK_API}/subscribers`, {
      method: "POST", headers,
      body: JSON.stringify(subscriberBody),
    });
    if (!subRes.ok) return resp(502, { ok: false, error: "Save failed" });

    const segRes = await fetch(
      `${FLODESK_API}/subscribers/${encodeURIComponent(email)}/segments`,
      { method: "POST", headers, body: JSON.stringify({ segment_ids: [segmentId] }) }
    );
    if (!segRes.ok) return resp(200, { ok: true, warn: "subscribed-but-segment-failed" });

    return resp(200, { ok: true });
  } catch (err) {
    return resp(502, { ok: false, error: "Connection error" });
  }
};

function resp(statusCode, obj) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}
