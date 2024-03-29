const Stripe = require("stripe");

async function payment({
  stripe = new Stripe(process.env.STRIPE_KEY),
  payment_method_types = ["card","cash"],
  mode = "payment",
  customer_email,
  metadata = {},
  cancel_url = process.env.CANCEL_URL,
  success_url = process.env.SUCCESS_URL,
  line_items = [],
} = {}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types,
    mode,
    customer_email,
    metadata,
    cancel_url,
    success_url,
    line_items,
  });
  return session;
}
module.exports = payment;
