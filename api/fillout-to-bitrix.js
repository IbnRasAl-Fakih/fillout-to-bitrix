const ALMATY_UTC_OFFSET_MINUTES = 5 * 60;

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatAlmatyDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value !== "string") {
    return value;
  }

  const dottedAmPmMatch = value.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (dottedAmPmMatch) {
    const [, day, month, year, rawHours, minutes, meridiem] = dottedAmPmMatch;
    let hours = Number(rawHours);

    if (meridiem.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }

    if (meridiem.toUpperCase() === "PM" && hours !== 12) {
      hours += 12;
    }

    return `${padDatePart(day)}.${padDatePart(month)}.${year} ${padDatePart(hours)}:${minutes}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const almatyDate = new Date(
    parsed.getTime() + ALMATY_UTC_OFFSET_MINUTES * 60 * 1000
  );

  const day = padDatePart(almatyDate.getUTCDate());
  const month = padDatePart(almatyDate.getUTCMonth() + 1);
  const year = almatyDate.getUTCFullYear();
  const hours = padDatePart(almatyDate.getUTCHours());
  const minutes = padDatePart(almatyDate.getUTCMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function firstValue(value) {
  if (Array.isArray(value)) {
    return firstValue(value[0]);
  }

  if (value && typeof value === "object") {
    return value.value || value.label || value.name || "";
  }

  return value || "";
}

function listValues(value) {
  if (Array.isArray(value)) {
    return value.map(firstValue).filter(Boolean).join(", ");
  }

  return firstValue(value);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const body = req.body || {};
    const bitrixUrl = process.env.BITRIX_WEBHOOK_URL;

    if (!bitrixUrl) {
      return res.status(500).json({
        success: false,
        error: "BITRIX_WEBHOOK_URL is not set"
      });
    }

    const payload = {
      entityTypeId: Number(body["entityTypeId"] || 1046),
      fields: {
        ufCrm12FullName: body["fields.ufCrm12FullName"] || "",
        ufCrm12JobTitle: body["fields.ufCrm12JobTitle"] || "",
        ufCrm12Company: body["fields.ufCrm12Company"] || "",
        ufCrm12Date: formatAlmatyDate(body["fields.ufCrm12Date"]),
        ufCrm12ActivityObserved: body["fields.ufCrm12ActivityObserved"] || "",
        ufCrm12WorkArea: body["fields.ufCrm12WorkArea"] || "",

        // Если Bitrix поле строковое — отправляем URL
        // Если поле файловое — так не сработает, тогда нужен отдельный сценарий загрузки файла
        ufCrm12DiscrepancyPhoto:
          Array.isArray(body["fields.ufCrm12DiscrepancyPhoto"]) &&
          body["fields.ufCrm12DiscrepancyPhoto"][0]?.url
            ? body["fields.ufCrm12DiscrepancyPhoto"][0].url
            : "",

        ufCrm12SourceOfDanger: firstValue(body["fields.ufCrm12SourceOfDanger"]),

        ufCrm12PpeCategories: listValues(body["fields.ufCrm12PpeCategories"]),

        ufCrm12UnsafeDetails: body["fields.ufCrm12UnsafeDetails"] || "",
        ufCrm12SafetyReinforcement: body["fields.ufCrm12SafetyReinforcement"] || "",
        ufCrm12ImmediateActions: body["fields.ufCrm12ImmediateActions"] || "",
        ufCrm12AssignedTo: body["fields.ufCrm12AssignedTo"] || ""
      }
    };

    console.log("=== FULL FILLOUT BODY ===");
    console.log(JSON.stringify(body, null, 2));

    console.log("=== SENT TO BITRIX ===");
    console.log(JSON.stringify(payload, null, 2));

    const bitrixResponse = await fetch(bitrixUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resultText = await bitrixResponse.text();

    if (!bitrixResponse.ok) {
      return res.status(bitrixResponse.status).json({
        success: false,
        error: "Bitrix request failed",
        bitrix_status: bitrixResponse.status,
        bitrix_response: resultText,
        sent_to_bitrix: payload
      });
    }

    return res.status(200).json({
      success: true,
      sent_to_bitrix: payload,
      bitrix_response: resultText
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Unknown server error"
    });
  }
}
