// Demo comments for the seeder. Each row names a diagram by title and an author by position in the list of
// accounts (the administrator first, then the demo users), so the data holds no ids and the seed can run twice.
const ROWS = [
  { diagram: 'Order processing', author: 1, text: 'The payment step should come before the stock check.' },
  { diagram: 'Order processing', author: 0, text: 'Agreed, I moved the check after the payment in the next version.' },
  { diagram: 'Order processing', author: 2, text: 'Can we add a branch for a failed payment?' },
  { diagram: 'Billing schema', author: 2, text: 'Is the invoice total stored or calculated from the lines?' },
  { diagram: 'Billing schema', author: 3, text: 'Stored, it is easier to audit. The lines are copied into the invoice.' },
  { diagram: 'Login flow', author: 1, text: 'Looks right. A second line for the expired token would help.' },
];

module.exports = { ROWS };
