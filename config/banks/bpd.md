# Bank Profile: BPD

## Basic information

- Bank name: BPD
- Country: RD
- Website URL: https://popularenlinea.com/personas/Paginas/Home.aspx
- Login URL: https://www.bpd.com.do/
- Currency defaults: RD
- Last reviewed:

## Authentication notes

- Login is manual: yes
- 2FA expected: yes
- CAPTCHA expected: yes
- Session usually persists: yes
- Do not store password: no

## Safe pages

The AI agent may visit:

- Account overview: https://ib.bpd.com.do/dashboard
- Checking/savings list: https://ib.bpd.com.do/accounts?accountType=CuentasAll
- Credit card summary: https://ib.bpd.com.do/accounts?accountType=TarjetaAll
- Loan summary: https://ib.bpd.com.do/accounts?accountType=PrestamosAll
- Transaction list: https://ib.bpd.com.do/accountdetails?accountType=Corriente&currency=DOP

## Forbidden pages

The AI agent must not visit or interact with:

- Transfers:
- Payments:
- Beneficiaries:
- Credit applications:
- Profile/settings:
- Card controls:

## Extraction notes

- Table headers to look for: [Alias, Número, Tipo, Moneda, Balance]
- Date format used: dd/MM/yyyy
- Decimal format used: #.##
- Currency symbols used: RD$, USD$, $
- Pages that load slowly: 

## Known risks

- Popups: yes
- Session timeouts:
- Pages that look like action pages:
- Misleading labels:
