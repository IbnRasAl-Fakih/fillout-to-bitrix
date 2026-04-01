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
        ufCrm12Date: body["fields.ufCrm12Date"] || "",
        ufCrm12ActivityObserved: body["fields.ufCrm12ActivityObserved"] || "",
        ufCrm12WorkArea: body["fields.ufCrm12WorkArea"] || "",

        // Если Bitrix поле строковое — отправляем URL
        // Если поле файловое — так не сработает, тогда нужен отдельный сценарий загрузки файла
        ufCrm12DiscrepancyPhoto:
          Array.isArray(body["fields.ufCrm12DiscrepancyPhoto"]) &&
          body["fields.ufCrm12DiscrepancyPhoto"][0]?.url
            ? body["fields.ufCrm12DiscrepancyPhoto"][0].url
            : "",

        // Для множественных списков лучше оставить массив
        ufCrm12SourceOfDanger: Array.isArray(body["fields.ufCrm12SourceOfDanger"])
          ? body["fields.ufCrm12SourceOfDanger"]
          : [],

        ufCrm12PpeCategories: Array.isArray(body["fields.ufCrm12PpeCategories"])
          ? body["fields.ufCrm12PpeCategories"]
          : [],

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