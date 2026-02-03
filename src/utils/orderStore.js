const processedOrders = new Map();

const hasOrder = (orderId) => processedOrders.has(orderId);

const saveOrder = (orderId, data) => {
  processedOrders.set(orderId, data);
};

module.exports = { hasOrder, saveOrder };
