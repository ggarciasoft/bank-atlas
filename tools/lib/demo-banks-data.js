// Definitions for the three local demo banks used to practice extraction.
// Each bank runs on its own port and exposes different accounts, cards, and loans.

/** @typedef {{ id: string, name: string, port: number, theme: string, login_url: string, dashboard_url: string, input: object, items: object }} DemoBank */

export const DEMO_BANK_IDS = ["demo-savings", "demo-cards", "demo-loans"];

const EXTRACTED_AT = "2026-07-09T19:00:00-04:00";

/** @returns {DemoBank[]} */
export function getDemoBankDefinitions() {
  return [demoSavings(), demoCards(), demoLoans()];
}

/** @param {string} id */
export function getDemoBankDefinition(id) {
  const bank = getDemoBankDefinitions().find((b) => b.id === id);
  if (!bank) throw new Error(`unknown demo bank "${id}"`);
  return bank;
}

function demoSavings() {
  const port = 5181;
  return {
    id: "demo-savings",
    name: "Atlas Savings",
    port,
    theme: "green",
    login_url: `http://127.0.0.1:${port}/login`,
    dashboard_url: `http://127.0.0.1:${port}/home`,
    input: {
      bank_id: "demo-savings",
      bank_name: "Atlas Savings",
      extraction_status: "completed",
      extracted_at: EXTRACTED_AT,
      accounts: [
        {
          account_id_masked: "****2101",
          account_name: "Cuenta Ahorro Personal",
          account_type: "savings",
          currency: "DOP",
          available_balance: 8450,
          current_balance: 8450,
          source_page: "account overview",
          confidence: "high",
          needs_review: false,
        },
        {
          account_id_masked: "****2102",
          account_name: "Ahorro en Dolares",
          account_type: "savings",
          currency: "USD",
          available_balance: 75.5,
          current_balance: 75.5,
          source_page: "account overview",
          confidence: "high",
          needs_review: false,
        },
      ],
      credit_cards: [
        {
          card_id_masked: "****3101",
          card_name: "Visa Clasica",
          currency: "DOP",
          current_balance: 1200,
          statement_balance: 1150,
          minimum_payment: 95,
          due_date: "2026-07-18",
          available_credit: 13800,
          credit_limit: 15000,
          source_page: "credit card summary",
          confidence: "high",
          needs_review: false,
        },
      ],
      loans: [],
      transactions: [
        {
          account_id_masked: "****2101",
          date: "2026-07-08",
          description: "FARMACIA CAROL",
          amount: 890,
          direction: "debit",
          currency: "DOP",
          category_guess: "health",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****2101",
          date: "2026-07-07",
          description: "TRANSFERENCIA RECIBIDA",
          amount: 5000,
          direction: "credit",
          currency: "DOP",
          category_guess: "transfer",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****2102",
          date: "2026-07-06",
          description: "WISE TRANSFER",
          amount: 25,
          direction: "credit",
          currency: "USD",
          category_guess: "transfer",
          source_page: "transactions",
          confidence: "high",
        },
      ],
      notes: ["Demo bank — savings-focused. Local mock at port 5181."],
      warnings: [],
    },
    items: {
      bank_id: "demo-savings",
      bank_name: "Atlas Savings",
      accounts: [
        {
          key: "****2101|DOP",
          account_id_masked: "****2101",
          account_name: "Cuenta Ahorro Personal",
          account_type: "savings",
          currency: "DOP",
          notes: "",
          user_edited: [],
        },
        {
          key: "****2102|USD",
          account_id_masked: "****2102",
          account_name: "Ahorro en Dolares",
          account_type: "savings",
          currency: "USD",
          notes: "",
          user_edited: [],
        },
      ],
      credit_cards: [
        {
          key: "****3101|DOP",
          card_id_masked: "****3101",
          card_name: "Visa Clasica",
          currency: "DOP",
          credit_limit: 15000,
          statement_closing_day: 12,
          payment_due_day: 18,
          notes: "",
          user_edited: [],
        },
      ],
      loans: [],
    },
  };
}

function demoCards() {
  const port = 5182;
  return {
    id: "demo-cards",
    name: "Nova Credit",
    port,
    theme: "purple",
    login_url: `http://127.0.0.1:${port}/login`,
    dashboard_url: `http://127.0.0.1:${port}/home`,
    input: {
      bank_id: "demo-cards",
      bank_name: "Nova Credit",
      extraction_status: "completed",
      extracted_at: EXTRACTED_AT,
      accounts: [
        {
          account_id_masked: "****4201",
          account_name: "Cuenta Corriente",
          account_type: "checking",
          currency: "DOP",
          available_balance: 3200,
          current_balance: 3200,
          source_page: "account overview",
          confidence: "high",
          needs_review: false,
        },
      ],
      credit_cards: [
        {
          card_id_masked: "****5201",
          card_name: "Mastercard Oro",
          currency: "DOP",
          current_balance: 4800,
          statement_balance: 4650,
          minimum_payment: 380,
          due_date: "2026-07-22",
          available_credit: 20200,
          credit_limit: 25000,
          source_page: "credit card summary",
          confidence: "high",
          needs_review: false,
        },
        {
          card_id_masked: "****5202",
          card_name: "Amex Internacional",
          currency: "USD",
          current_balance: 45,
          statement_balance: 42,
          minimum_payment: 25,
          due_date: "2026-07-28",
          available_credit: 455,
          credit_limit: 500,
          source_page: "credit card summary",
          confidence: "high",
          needs_review: false,
        },
      ],
      loans: [],
      transactions: [
        {
          account_id_masked: "****4201",
          date: "2026-07-08",
          description: "AMAZON MARKETPLACE",
          amount: 1890,
          direction: "debit",
          currency: "DOP",
          category_guess: "shopping",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****4201",
          date: "2026-07-07",
          description: "PAGO TARJETA NOVA",
          amount: 2500,
          direction: "debit",
          currency: "DOP",
          category_guess: "card_payment",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****4201",
          date: "2026-07-05",
          description: "SPOTIFY",
          amount: 349,
          direction: "debit",
          currency: "DOP",
          category_guess: "streaming",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****4201",
          date: "2026-07-03",
          description: "DEPOSITO NOMINA",
          amount: 18500,
          direction: "credit",
          currency: "DOP",
          category_guess: "salary",
          source_page: "transactions",
          confidence: "high",
        },
      ],
      notes: ["Demo bank — credit-card-focused. Local mock at port 5182."],
      warnings: [],
    },
    items: {
      bank_id: "demo-cards",
      bank_name: "Nova Credit",
      accounts: [
        {
          key: "****4201|DOP",
          account_id_masked: "****4201",
          account_name: "Cuenta Corriente",
          account_type: "checking",
          currency: "DOP",
          notes: "",
          user_edited: [],
        },
      ],
      credit_cards: [
        {
          key: "****5201|DOP",
          card_id_masked: "****5201",
          card_name: "Mastercard Oro",
          currency: "DOP",
          credit_limit: 25000,
          statement_closing_day: 15,
          payment_due_day: 22,
          notes: "",
          user_edited: [],
        },
        {
          key: "****5202|USD",
          card_id_masked: "****5202",
          card_name: "Amex Internacional",
          currency: "USD",
          credit_limit: 500,
          statement_closing_day: 20,
          payment_due_day: 28,
          notes: "",
          user_edited: [],
        },
      ],
      loans: [],
    },
  };
}

function demoLoans() {
  const port = 5183;
  return {
    id: "demo-loans",
    name: "Prime Lending",
    port,
    theme: "blue",
    login_url: `http://127.0.0.1:${port}/login`,
    dashboard_url: `http://127.0.0.1:${port}/home`,
    input: {
      bank_id: "demo-loans",
      bank_name: "Prime Lending",
      extraction_status: "completed",
      extracted_at: EXTRACTED_AT,
      accounts: [
        {
          account_id_masked: "****6301",
          account_name: "Cuenta de Servicio",
          account_type: "savings",
          currency: "DOP",
          available_balance: 12100,
          current_balance: 12100,
          source_page: "account overview",
          confidence: "high",
          needs_review: false,
        },
      ],
      credit_cards: [],
      loans: [
        {
          loan_id_masked: "****7301",
          loan_name: "Hipoteca Residencial",
          loan_type: "mortgage",
          currency: "DOP",
          remaining_balance: 850000,
          monthly_payment: 28500,
          next_due_date: "2026-07-15",
          source_page: "loan summary",
          confidence: "high",
          needs_review: false,
        },
        {
          loan_id_masked: "****7302",
          loan_name: "Prestamo Personal",
          loan_type: "personal",
          currency: "DOP",
          remaining_balance: 95000,
          monthly_payment: 4200,
          next_due_date: "2026-07-25",
          source_page: "loan summary",
          confidence: "high",
          needs_review: false,
        },
      ],
      transactions: [
        {
          account_id_masked: "****6301",
          date: "2026-07-08",
          description: "PAGO CUOTA HIPOTECA",
          amount: 28500,
          direction: "debit",
          currency: "DOP",
          category_guess: "loan_payment",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****6301",
          date: "2026-07-05",
          description: "PAGO CUOTA PERSONAL",
          amount: 4200,
          direction: "debit",
          currency: "DOP",
          category_guess: "loan_payment",
          source_page: "transactions",
          confidence: "high",
        },
        {
          account_id_masked: "****6301",
          date: "2026-07-01",
          description: "DEPOSITO",
          amount: 35000,
          direction: "credit",
          currency: "DOP",
          category_guess: "deposit",
          source_page: "transactions",
          confidence: "high",
        },
      ],
      notes: ["Demo bank — loan-focused. Local mock at port 5183."],
      warnings: [],
    },
    items: {
      bank_id: "demo-loans",
      bank_name: "Prime Lending",
      accounts: [
        {
          key: "****6301|DOP",
          account_id_masked: "****6301",
          account_name: "Cuenta de Servicio",
          account_type: "savings",
          currency: "DOP",
          notes: "",
          user_edited: [],
        },
      ],
      credit_cards: [],
      loans: [
        {
          key: "****7301|DOP",
          loan_id_masked: "****7301",
          loan_name: "Hipoteca Residencial",
          loan_type: "mortgage",
          currency: "DOP",
          monthly_payment: 28500,
          payment_due_day: 15,
          term_months: null,
          notes: "",
          user_edited: [],
        },
        {
          key: "****7302|DOP",
          loan_id_masked: "****7302",
          loan_name: "Prestamo Personal",
          loan_type: "personal",
          currency: "DOP",
          monthly_payment: 4200,
          payment_due_day: 25,
          term_months: null,
          notes: "",
          user_edited: [],
        },
      ],
    },
  };
}

/** Markdown profile for config/banks/<id>.md */
export function demoBankProfile(bank) {
  return `# Bank Profile: ${bank.name}

## Basic information

- Bank name: ${bank.name}
- Country: Dominican Republic (demo)
- Website URL: http://127.0.0.1:${bank.port}/
- Login URL: ${bank.login_url}
- Dashboard URL: ${bank.dashboard_url}
- Currency defaults: DOP, USD
- Last reviewed: 2026-07-09
- Demo bank: yes (local mock server, port ${bank.port})

## Authentication notes

- Login is manual: yes (when form fields are empty)
- Auto-login if form filled: yes
- 2FA expected: no
- CAPTCHA expected: no
- Session usually persists: yes
- Do not store password: yes

## Safe pages

The AI agent may visit:

- Account overview: ${bank.dashboard_url}
- Checking/savings list: ${bank.dashboard_url}
- Credit card summary: ${bank.dashboard_url}
- Loan summary: ${bank.dashboard_url}
- Transaction list: ${bank.dashboard_url}

## Forbidden pages

The AI agent must not visit or interact with:

- Transfers: /transfer
- Payments: /pay
- Beneficiaries: /beneficiaries
- Credit applications: /apply
- Profile/settings: /settings
- Card controls: /card-controls

## Extraction notes

- Demo data only — amounts are fictional.
- Table headers use Spanish labels where applicable.
- Date format: YYYY-MM-DD in transaction tables.
- Decimal format: comma thousands, dot decimals in display (RD$ 8,450.00).
- Login form is pre-filled for auto-login testing.

## Known risks

- Popups: none
- Session timeouts: none (static demo)
- Pages that look like action pages: /transfer and /pay exist but are forbidden
- Misleading labels: none
`;
}
