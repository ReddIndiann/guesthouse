/** Ghana cedis — used across the guest house */
export function formatMoney(amount: number): string {
  return `₵${amount.toLocaleString('en-GH')}`
}

export function formatMoneyPerNight(amount: number): string {
  return `${formatMoney(amount)} / night`
}
