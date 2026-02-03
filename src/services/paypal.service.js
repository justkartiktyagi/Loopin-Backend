const paypal = require("@paypal/checkout-server-sdk");

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET,
);

const client = new paypal.core.PayPalHttpClient(environment);

const createPayPalOrder = async () => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "5",
        },
      },
    ],
    application_context: {
      brand_name: "LoopIN",
      landing_page: "LOGIN",
      user_action: "PAY_NOW",
      return_url: "http://localhost:3000/paypal-success",
      cancel_url: "http://localhost:3000/paypal-cancel",
    },
  });

  const response = await client.execute(request);
  return response.result;
};

const capturePayPalOrder = async (orderId) => {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  return response.result;
};

module.exports = { createPayPalOrder, capturePayPalOrder, client };
