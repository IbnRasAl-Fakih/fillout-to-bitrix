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

    // Здесь сопоставляются поля Fillout -> поля Bitrix24
    // Слева: поле Bitrix24
    // Справа: ключ, который приходит из Fillout
    const payload = {
      entityTypeId: 1046,
      fields: {
        ufCrm12FullName: body["Наблюдатель"] || "",
        ufCrm12JobTitle: body["Должность"] || "",
        ufCrm12Company: body["Компания"] || "",
        ufCrm12Date: body["Дата"] || "",
        ufCrm12ActivityObserved: body["Наблюдаемая работа"] || "",
        ufCrm12WorkArea: body["Рабочая зона"] || "",
        ufCrm12DiscrepancyPhoto: body["Фото несоответствия"] || "",
        ufCrm12SourceOfDanger: body["Источник опасности"] || "",
        ufCrm12PpeCategories: body["СИЗ - категории"] || ""
      }
    };

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
        bitrix_response: resultText
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