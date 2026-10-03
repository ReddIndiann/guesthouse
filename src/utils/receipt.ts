export function buildWhatsAppReceiptMessage({
  propertyName,
  propertyPhone,
  guestName,
  roomNumber,
  schedule,
  totalAmount,
  amountPaid,
  balance,
  paymentMethod,
  paymentReference,
  wifiPassword,
  doorCode,
  checkInInstructions,
  propertyType,
}: {
  propertyName: string
  propertyPhone?: string
  guestName: string
  roomNumber: string
  schedule: string
  totalAmount: number
  amountPaid: number
  balance: number
  paymentMethod?: string
  paymentReference?: string
  wifiPassword?: string
  doorCode?: string
  checkInInstructions?: string
  propertyType?: string
}): string {
  const isAirbnb = propertyType === 'airbnb' || !!doorCode
  const unitLabel = isAirbnb ? 'Unit / Apt' : 'Room'

  const lines = [
    `*RECEIPT — ${propertyName.toUpperCase()}*`,
    `────────────────────────`,
    `Guest: ${guestName}`,
    `${unitLabel}: ${roomNumber}`,
    `Stay: ${schedule}`,
    `────────────────────────`,
    `Total: ₵${totalAmount.toFixed(2)}`,
    `Paid: ₵${amountPaid.toFixed(2)}`,
  ]

  if (balance > 0) {
    lines.push(`*Balance Due: ₵${balance.toFixed(2)}*`)
  }

  if (paymentMethod) {
    const methodStr = paymentMethod === 'momo' ? 'Mobile Money (MoMo)' : paymentMethod.toUpperCase()
    lines.push(`Payment Method: ${methodStr}`)
  }

  if (paymentReference) {
    lines.push(`Txn Ref: ${paymentReference}`)
  }

  if (doorCode) {
    lines.push(`────────────────────────`)
    lines.push(`🔑 *Self Check-in Door PIN:* ${doorCode}`)
    if (checkInInstructions) {
      lines.push(`📍 *Instructions:* ${checkInInstructions}`)
    }
  }

  if (wifiPassword) {
    if (!doorCode) lines.push(`────────────────────────`)
    lines.push(`📶 *Wi-Fi Password:* ${wifiPassword}`)
  }

  if (propertyPhone) {
    lines.push(`Contact: ${propertyPhone}`)
  }

  lines.push(`────────────────────────`)
  lines.push(`Thank you for staying with us!`)

  return lines.join('\n')
}

export function openWhatsAppReceipt(phone: string | undefined, message: string) {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '')
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '233' + cleanPhone.slice(1)
  }
  const encoded = encodeURIComponent(message)
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`
  window.open(url, '_blank')
}
