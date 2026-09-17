// Every response looks like { success, message?, data?, meta? }

const sendSuccess = (res, { status = 200, message, data, meta } = {}) => {
  const body = { success: true };

  if (message !== undefined) body.message = message;
  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;

  return res.status(status).json(body);
};

const sendError = (res, { status = 500, message, headers } = {}) => {
  if (headers) res.set(headers);
  return res.status(status).json({ success: false, message });
};

module.exports = { sendSuccess, sendError };
