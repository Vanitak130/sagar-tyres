'use server'

import config from '@payload-config'
import {
  commitTransaction,
  createPayloadRequest,
  getPayload,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { redirect } from 'next/navigation'
import { currentUser, loginUser, logoutUser } from '@/lib/app-auth'

export type ActionState = { ok: boolean; message: string; invoice?: string }
const initialError = (error: unknown): ActionState => ({
  ok: false,
  message: error instanceof Error ? error.message : 'Something went wrong.',
})

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const number = (form: FormData, key: string) => {
  const value = Number(form.get(key) ?? 0)
  if (!Number.isFinite(value)) throw new Error(`${key} must be a valid number.`)
  return value
}
const choice = <T extends readonly string[]>(
  form: FormData,
  key: string,
  options: T,
): T[number] => {
  const value = text(form, key)
  if (!options.includes(value)) throw new Error(`Please select a valid ${key}.`)
  return value as T[number]
}
const id = (value: unknown) =>
  typeof value === 'object' && value !== null && 'id' in value ? String(value.id) : String(value)
const now = () => new Date().toISOString()
const businessID = (prefix: string) =>
  `${prefix}-${new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replaceAll('-', '')}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

async function withStaff() {
  const user = await currentUser()
  if (!user) throw new Error('Please sign in to continue.')
  return { user, payload: await getPayload({ config }) }
}

async function transaction<T>(
  payload: Payload,
  user: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
  work: (req: PayloadRequest) => Promise<T>,
) {
  const req = await createPayloadRequest({ payload })
  req.user = user
  const started = await initTransaction(req)
  try {
    const result = await work(req)
    if (started) await commitTransaction(req)
    return result
  } catch (error) {
    if (started) await killTransaction(req)
    throw error
  }
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const name = text(form, 'name')
    const email = text(form, 'email').toLowerCase()
    const password = text(form, 'password')
    if (!name || !email || password.length < 8) {
      throw new Error('Enter your name, email, and a password of at least 8 characters.')
    }
    const payload = await getPayload({ config })
    await payload.create({
      collection: 'users',
      data: { name, email, password, role: 'owner' },
      overrideAccess: false,
    })
    await loginUser(email, password)
    return { ok: true, message: 'Owner account created.' }
  } catch (error) {
    return initialError(error)
  }
}

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await loginUser(text(form, 'email').toLowerCase(), text(form, 'password'))
    return { ok: true, message: 'Welcome back.' }
  } catch {
    return { ok: false, message: 'Email or password is incorrect.' }
  }
}

export async function logoutAction() {
  await logoutUser()
  redirect('/')
}

export async function createProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    const required = ['brand', 'model', 'size', 'category', 'tyreType']
    for (const field of required) if (!text(form, field)) throw new Error(`Please enter ${field}.`)
    const openingQuantity = number(form, 'openingQuantity')
    if (!Number.isInteger(openingQuantity) || openingQuantity < 0) {
      throw new Error('Opening quantity must be a whole number of zero or more.')
    }
    const purchasePrice = number(form, 'purchasePrice')
    const sku = businessID('TYR')
    await transaction(payload, user, async (req) => {
      const product = await payload.create({
        collection: 'products',
        overrideAccess: false,
        user,
        req,
        data: {
          sku,
          brand: text(form, 'brand'),
          model: text(form, 'model'),
          size: text(form, 'size'),
          category: choice(form, 'category', ['front', 'rear', 'both'] as const),
          tyreType: choice(form, 'tyreType', ['tubeless', 'tube'] as const),
          compatibleBikes: text(form, 'compatibleBikes')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          purchasePrice,
          sellingPrice: number(form, 'sellingPrice'),
          currentStock: openingQuantity,
          minimumStock: number(form, 'minimumStock'),
          description: text(form, 'description'),
          active: true,
        },
      })
      if (openingQuantity > 0) {
        await payload.create({
          collection: 'stock-batches',
          overrideAccess: false,
          user,
          req,
          data: {
            batchCode: `OPEN-${sku}`,
            product: product.id,
            purchasedAt: now(),
            originalQuantity: openingQuantity,
            remainingQuantity: openingQuantity,
            unitCost: purchasePrice,
          },
        })
        await payload.create({
          collection: 'stock-movements',
          overrideAccess: false,
          user,
          req,
          data: {
            product: product.id,
            type: 'adjustment',
            quantity: openingQuantity,
            reference: `Opening stock · ${sku}`,
            occurredAt: now(),
            notes: 'Opening quantity entered when the tyre product was created.',
          },
        })
      }
    })
    return {
      ok: true,
      message:
        openingQuantity > 0
          ? `Tyre added with ${openingQuantity} units in opening stock.`
          : 'Tyre added to inventory.',
    }
  } catch (error) {
    return initialError(error)
  }
}

export async function createContactAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    const kind = text(form, 'kind')
    const name = text(form, 'name')
    const mobile = text(form, 'mobile')
    if (!name || !mobile) throw new Error('Name and mobile number are required.')
    if (kind === 'dealer') {
      await payload.create({
        collection: 'dealers',
        overrideAccess: false,
        user,
        data: {
          name,
          mobile,
          contactPerson: text(form, 'contactPerson'),
          notes: text(form, 'notes'),
        },
      })
    } else {
      await payload.create({
        collection: 'customers',
        overrideAccess: false,
        user,
        data: {
          name,
          mobile,
          bikeBrand: text(form, 'bikeBrand'),
          bikeModel: text(form, 'bikeModel'),
          registrationNumber: text(form, 'registrationNumber'),
          notes: text(form, 'notes'),
          totalSpent: 0,
          visits: 0,
        },
      })
    }
    return { ok: true, message: kind === 'dealer' ? 'Dealer added.' : 'Customer added.' }
  } catch (error) {
    return initialError(error)
  }
}

type PurchaseLine = { product: string; quantity: number; unitCost: number }
export async function createPurchaseAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    const lines = JSON.parse(text(form, 'lines')) as PurchaseLine[]
    if (!Array.isArray(lines) || !lines.length) throw new Error('Add at least one tyre.')
    for (const line of lines) {
      if (!line.product || line.quantity < 1 || line.unitCost < 0)
        throw new Error('Check purchase line values.')
    }
    const invoiceNumber = text(form, 'invoiceNumber')
    const dealer = text(form, 'dealer')
    if (!invoiceNumber || !dealer) throw new Error('Invoice number and dealer are required.')
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0)
    const additionalCharges = number(form, 'additionalCharges')
    const discount = number(form, 'discount')
    const finalAmount = Math.max(0, subtotal + additionalCharges - discount)
    await transaction(payload, user, async (req) => {
      const purchase = await payload.create({
        collection: 'purchases',
        overrideAccess: false,
        user,
        req,
        data: {
          invoiceNumber,
          dealer,
          purchasedAt: text(form, 'purchasedAt') || now(),
          lines: lines.map((line) => ({ ...line, lineTotal: line.quantity * line.unitCost })),
          additionalCharges,
          discount,
          finalAmount,
          amountPaid: number(form, 'amountPaid'),
          paymentStatus: choice(form, 'paymentStatus', ['paid', 'partial', 'unpaid'] as const),
          paymentMethod: choice(form, 'paymentMethod', ['cash', 'upi', 'card', 'bank'] as const),
          notes: text(form, 'notes'),
          status: 'posted',
        },
      })
      for (const line of lines) {
        const product = await payload.findByID({
          collection: 'products',
          id: line.product,
          overrideAccess: false,
          user,
          req,
        })
        await payload.create({
          collection: 'stock-batches',
          overrideAccess: false,
          user,
          req,
          data: {
            batchCode: `${invoiceNumber}-${line.product}-${crypto.randomUUID().slice(0, 5)}`,
            product: line.product,
            purchase: purchase.id,
            purchasedAt: text(form, 'purchasedAt') || now(),
            originalQuantity: line.quantity,
            remainingQuantity: line.quantity,
            unitCost: line.unitCost,
          },
        })
        await payload.update({
          collection: 'products',
          id: product.id,
          overrideAccess: false,
          user,
          req,
          data: {
            currentStock: (product.currentStock ?? 0) + line.quantity,
            purchasePrice: line.unitCost,
          },
        })
        await payload.create({
          collection: 'stock-movements',
          overrideAccess: false,
          user,
          req,
          data: {
            product: product.id,
            type: 'purchase',
            quantity: line.quantity,
            reference: invoiceNumber,
            occurredAt: now(),
          },
        })
      }
    })
    return { ok: true, message: 'Purchase posted and stock updated.' }
  } catch (error) {
    return initialError(error)
  }
}

type SaleLine = { product: string; quantity: number; unitPrice: number; discount: number }
export async function createSaleAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    const lines = JSON.parse(text(form, 'lines')) as SaleLine[]
    if (!Array.isArray(lines) || !lines.length) throw new Error('Add at least one tyre.')
    let invoice = businessID('ST')
    await transaction(payload, user, async (req) => {
      const saleLines = []
      let subtotal = 0
      let saleCogs = 0
      for (const line of lines) {
        if (!line.product || line.quantity < 1 || line.unitPrice < 0)
          throw new Error('Check sale line values.')
        const product = await payload.findByID({
          collection: 'products',
          id: line.product,
          overrideAccess: false,
          user,
          req,
        })
        if ((product.currentStock ?? 0) < line.quantity) {
          throw new Error(
            `${product.brand} ${product.model} has only ${product.currentStock ?? 0} in stock.`,
          )
        }
        const batches = await payload.find({
          collection: 'stock-batches',
          overrideAccess: false,
          user,
          req,
          where: {
            and: [
              { product: { equals: line.product } },
              { remainingQuantity: { greater_than: 0 } },
            ],
          },
          sort: 'purchasedAt',
          limit: 100,
        })
        let needed = line.quantity
        let cogs = 0
        const allocations: Array<{ batch: string; quantity: number; unitCost: number }> = []
        for (const batch of batches.docs) {
          if (needed === 0) break
          const take = Math.min(needed, batch.remainingQuantity)
          cogs += take * batch.unitCost
          allocations.push({ batch: String(batch.id), quantity: take, unitCost: batch.unitCost })
          await payload.update({
            collection: 'stock-batches',
            id: batch.id,
            overrideAccess: false,
            user,
            req,
            data: { remainingQuantity: batch.remainingQuantity - take },
          })
          needed -= take
        }
        if (needed > 0)
          throw new Error(`FIFO batches for ${product.model} are inconsistent with stock.`)
        const lineTotal = Math.max(0, line.quantity * line.unitPrice - (line.discount || 0))
        saleLines.push({
          ...line,
          discount: line.discount || 0,
          lineTotal,
          cogs,
          profit: lineTotal - cogs,
          allocations,
        })
        subtotal += line.quantity * line.unitPrice
        saleCogs += cogs
        await payload.update({
          collection: 'products',
          id: product.id,
          overrideAccess: false,
          user,
          req,
          data: { currentStock: (product.currentStock ?? 0) - line.quantity },
        })
      }
      const overallDiscount = number(form, 'discount')
      const lineDiscounts = lines.reduce((sum, line) => sum + (line.discount || 0), 0)
      const finalAmount = Math.max(0, subtotal - lineDiscounts - overallDiscount)
      const sale = await payload.create({
        collection: 'sales',
        overrideAccess: false,
        user,
        req,
        data: {
          invoiceNumber: invoice,
          customer: text(form, 'customer') || undefined,
          customerName: text(form, 'customerName') || 'Walk-in customer',
          customerMobile: text(form, 'customerMobile'),
          bikeBrand: text(form, 'bikeBrand'),
          bikeModel: text(form, 'bikeModel'),
          soldAt: now(),
          lines: saleLines,
          subtotal,
          discount: overallDiscount + lineDiscounts,
          finalAmount,
          cogs: saleCogs,
          grossProfit: finalAmount - saleCogs,
          paymentMethod: choice(form, 'paymentMethod', ['cash', 'upi', 'card', 'bank'] as const),
          paymentStatus: choice(form, 'paymentStatus', ['paid', 'partial', 'unpaid'] as const),
          notes: text(form, 'notes'),
          status: 'completed',
        },
      })
      invoice = sale.invoiceNumber
      for (const line of lines) {
        await payload.create({
          collection: 'stock-movements',
          overrideAccess: false,
          user,
          req,
          data: {
            product: line.product,
            type: 'sale',
            quantity: -line.quantity,
            reference: sale.invoiceNumber,
            occurredAt: now(),
          },
        })
      }
      const customerID = text(form, 'customer')
      if (customerID) {
        const customer = await payload.findByID({
          collection: 'customers',
          id: customerID,
          overrideAccess: false,
          user,
          req,
        })
        await payload.update({
          collection: 'customers',
          id: customer.id,
          overrideAccess: false,
          user,
          req,
          data: {
            totalSpent: (customer.totalSpent ?? 0) + finalAmount,
            visits: (customer.visits ?? 0) + 1,
            lastPurchaseDate: now(),
          },
        })
      }
    })
    return { ok: true, message: 'Sale complete. Stock and FIFO cost updated.', invoice }
  } catch (error) {
    return initialError(error)
  }
}

export async function createExpenseAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    if (!text(form, 'description') || number(form, 'amount') <= 0) {
      throw new Error('Enter an expense description and amount.')
    }
    await payload.create({
      collection: 'expenses',
      overrideAccess: false,
      user,
      data: {
        category: choice(form, 'category', [
          'rent',
          'electricity',
          'salary',
          'transportation',
          'maintenance',
          'food',
          'miscellaneous',
          'other',
        ] as const),
        description: text(form, 'description'),
        amount: number(form, 'amount'),
        expenseAt: text(form, 'expenseAt') || now(),
        paymentMethod: choice(form, 'paymentMethod', ['cash', 'upi', 'card', 'bank'] as const),
        notes: text(form, 'notes'),
      },
    })
    return { ok: true, message: 'Expense recorded.' }
  } catch (error) {
    return initialError(error)
  }
}

const editableCollections = [
  'products',
  'dealers',
  'customers',
  'purchases',
  'sales',
  'expenses',
] as const
type EditableCollection = (typeof editableCollections)[number]

function editableCollection(value: string): EditableCollection {
  if (!editableCollections.includes(value as EditableCollection)) {
    throw new Error('This record type cannot be changed here.')
  }
  return value as EditableCollection
}

export async function updateRecordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    const collection = editableCollection(text(form, 'collection'))
    const recordID = text(form, 'recordID')
    if (!recordID) throw new Error('Record ID is required.')

    if (collection === 'products') {
      await payload.update({
        collection,
        id: recordID,
        overrideAccess: false,
        user,
        data: {
          brand: text(form, 'brand'),
          model: text(form, 'model'),
          size: text(form, 'size'),
          category: choice(form, 'category', ['front', 'rear', 'both'] as const),
          tyreType: choice(form, 'tyreType', ['tubeless', 'tube'] as const),
          compatibleBikes: text(form, 'compatibleBikes')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
          purchasePrice: number(form, 'purchasePrice'),
          sellingPrice: number(form, 'sellingPrice'),
          currentStock: number(form, 'currentStock'),
          minimumStock: number(form, 'minimumStock'),
          description: text(form, 'description'),
        },
      })
    } else if (collection === 'dealers') {
      await payload.update({
        collection,
        id: recordID,
        overrideAccess: false,
        user,
        data: {
          name: text(form, 'name'),
          mobile: text(form, 'mobile'),
          contactPerson: text(form, 'contactPerson'),
          gstin: text(form, 'gstin'),
          address: text(form, 'address'),
          openingBalance: number(form, 'openingBalance'),
          notes: text(form, 'notes'),
        },
      })
    } else if (collection === 'customers') {
      await payload.update({
        collection,
        id: recordID,
        overrideAccess: false,
        user,
        data: {
          name: text(form, 'name'),
          mobile: text(form, 'mobile'),
          bikeBrand: text(form, 'bikeBrand'),
          bikeModel: text(form, 'bikeModel'),
          registrationNumber: text(form, 'registrationNumber'),
          totalSpent: number(form, 'totalSpent'),
          visits: number(form, 'visits'),
          notes: text(form, 'notes'),
        },
      })
    } else if (collection === 'purchases') {
      await payload.update({
        collection,
        id: recordID,
        overrideAccess: false,
        user,
        data: {
          invoiceNumber: text(form, 'invoiceNumber'),
          purchasedAt: text(form, 'purchasedAt'),
          additionalCharges: number(form, 'additionalCharges'),
          discount: number(form, 'discount'),
          finalAmount: number(form, 'finalAmount'),
          amountPaid: number(form, 'amountPaid'),
          paymentStatus: choice(form, 'paymentStatus', ['paid', 'partial', 'unpaid'] as const),
          paymentMethod: choice(form, 'paymentMethod', ['cash', 'upi', 'card', 'bank'] as const),
          notes: text(form, 'notes'),
          status: choice(form, 'status', ['posted', 'cancelled'] as const),
        },
      })
    } else if (collection === 'sales') {
      await payload.update({
        collection,
        id: recordID,
        overrideAccess: false,
        user,
        data: {
          invoiceNumber: text(form, 'invoiceNumber'),
          customerName: text(form, 'customerName'),
          customerMobile: text(form, 'customerMobile'),
          bikeBrand: text(form, 'bikeBrand'),
          bikeModel: text(form, 'bikeModel'),
          soldAt: text(form, 'soldAt'),
          subtotal: number(form, 'subtotal'),
          discount: number(form, 'discount'),
          finalAmount: number(form, 'finalAmount'),
          cogs: number(form, 'cogs'),
          grossProfit: number(form, 'grossProfit'),
          paymentMethod: choice(form, 'paymentMethod', ['cash', 'upi', 'card', 'bank'] as const),
          paymentStatus: choice(form, 'paymentStatus', ['paid', 'partial', 'unpaid'] as const),
          notes: text(form, 'notes'),
          status: choice(form, 'status', ['completed', 'cancelled', 'refunded'] as const),
        },
      })
    } else {
      await payload.update({
        collection,
        id: recordID,
        overrideAccess: false,
        user,
        data: {
          category: choice(form, 'category', [
            'rent',
            'electricity',
            'salary',
            'transportation',
            'maintenance',
            'food',
            'miscellaneous',
            'other',
          ] as const),
          description: text(form, 'description'),
          amount: number(form, 'amount'),
          expenseAt: text(form, 'expenseAt'),
          paymentMethod: choice(form, 'paymentMethod', ['cash', 'upi', 'card', 'bank'] as const),
          notes: text(form, 'notes'),
        },
      })
    }
    return { ok: true, message: 'Record updated.' }
  } catch (error) {
    return initialError(error)
  }
}

export async function deleteRecordAction(
  collectionValue: string,
  recordID: string,
): Promise<ActionState> {
  try {
    const { payload, user } = await withStaff()
    const collection = editableCollection(collectionValue)
    if (!recordID) throw new Error('Record ID is required.')
    await payload.delete({
      collection,
      id: recordID,
      overrideAccess: false,
      user,
    })
    return { ok: true, message: 'Record permanently deleted.' }
  } catch (error) {
    return initialError(error)
  }
}
