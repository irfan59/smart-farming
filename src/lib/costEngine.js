// Cash vs true profit (doc 06). Caller passes ONLY non-void transactions.
// income - paidOut = cashProfit; income - (paidOut + imputed) = trueProfit.
export function computeProfit(txns, normalizedAcres = 0) {
  let income = 0;
  let paidOut = 0;
  let imputed = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount;
    else if (t.isImputed) imputed += t.amount;
    else paidOut += t.amount;
  }
  const expense = paidOut + imputed;
  const cashProfit = income - paidOut;
  const trueProfit = income - expense;
  const perAcre = (n) => (normalizedAcres > 0 ? Math.round(n / normalizedAcres) : 0);
  return {
    income,
    paidOut,
    imputed,
    expense,
    cashProfit,
    trueProfit,
    perAcreCash: perAcre(cashProfit),
    perAcreTrue: perAcre(trueProfit),
  };
}
