const { createPayPalOrder } = require("../services/paypal.service");

const createOrder = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const order = await createPayPalOrder();

    res.json({
      orderId: order.id,
      approveLink: order.links.find((l) => l.rel === "approve").href,
    });
  } catch (err) {
    console.error("PayPal Error:", err);
    res.status(500).json({ error: "PayPal order creation failed" });
  }
};

const { capturePayPalOrder } = require("../services/paypal.service");
const { hasOrder, saveOrder } = require("../utils/orderStore");

const EXPECTED_AMOUNT = "5.00";
const EXPECTED_CURRENCY = "USD";

const captureOrder = async (req, res) => {
  try {
    const { orderId, name, email } = req.body;

    if (!orderId || !name || !email) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // 🔒 Prevent duplicate processing
    if (hasOrder(orderId)) {
      return res.status(409).json({ error: "Order already processed" });
    }
    // 💰 Capture payment
    const capture = await capturePayPalOrder(orderId);

    if (capture.status !== "COMPLETED") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const payment = capture.purchase_units[0].payments.captures[0];
    const captureId = payment.id; // ✅ FIXED

    // 🛑 Validate payment details
    if (
      Number(payment.amount.value) !== 5 ||
      payment.amount.currency_code !== EXPECTED_CURRENCY
    ) {
      return res.status(400).json({ error: "Invalid payment amount" });
    }

    // 🧾 Mark as processed
    saveOrder(orderId, {
      email,
      captureId,
      amount: payment.amount.value,
    });

    // 🚚 Deliver product (Google Sheet)
    const webhookResponse = await fetch(process.env.SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.APPS_SCRIPT_SECRET, // 🔥 REQUIRED
        name,
        email,
        orderId,
        captureId,
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error("Sheet webhook failed");
    }

    const sheetResult = await webhookResponse.json();

    return res.json({
      success: true,
      payment: "COMPLETED",
      sheet: sheetResult,
    });
  } catch (err) {
    console.error("CAPTURE ERROR:", err.message);
    return res.status(500).json({ error: "Delivery failed" });
  }
};
module.exports = { createOrder, captureOrder };
